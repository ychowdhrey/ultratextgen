#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'https://ultratextgen.com';
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');
const REPO_ROOT = path.join(__dirname, '..');

// Folders to exclude when searching for index.html
const EXCLUDED_FOLDERS = [
  'assets', 'css', 'js', 'images', 'img', 
  'fonts', 'data', 'scripts', 'node_modules', 
  'dist', 'build'
];

/**
 * Recursively find all index.html files in the repository
 */
function findIndexFiles(dir, relativePath = '') {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
    
    // Skip excluded folders
    if (entry.isDirectory() && EXCLUDED_FOLDERS.includes(entry.name)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      results.push(...findIndexFiles(fullPath, relPath));
    } else if (entry.name === 'index.html') {
      results.push(relPath);
    }
  }
  
  return results;
}

/**
 * Convert a file path to a URL
 */
function pathToUrl(filePath) {
  // Root index.html -> /
  if (filePath === 'index.html') {
    return '/';
  }
  
  // Remove 'index.html' and ensure trailing slash
  const urlPath = filePath.replace(/\/index\.html$/, '/');
  return '/' + urlPath;
}

/**
 * Get the last modified date from git for a file
 */
function getGitLastMod(filePath) {
  try {
    // Use repo-relative path (safer in CI and Cloudflare)
    const isoDate = execSync(
      `git log -1 --format=%cI -- "${filePath}"`,
      { cwd: REPO_ROOT, encoding: 'utf8' }
    ).trim();

    if (!isoDate) {
      // Fallback to current date if git returns empty
      return new Date().toISOString().slice(0, 10);
    }

    // Convert ISO date to YYYY-MM-DD
    return isoDate.split('T')[0];

  } catch (error) {
    // If git fails (e.g., shallow clone, no history)
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Determine URL type for default priority/changefreq
 */
function getUrlDefaults(url) {
  if (url === '/') {
    return { changefreq: 'daily', priority: '1.0' };
  } else if (url === '/category/') {
    return { changefreq: 'weekly', priority: '0.9' };
  } else if (url.match(/^\/[^/]+\/$/) && !url.startsWith('/category/')) {
    // Platform pages (one level deep, not category)
    return { changefreq: 'weekly', priority: '0.8' };
  } else if (url.match(/^\/category\/[^/]+\/$/) && url !== '/category/') {
    // Category family pages
    return { changefreq: 'weekly', priority: '0.8' };
  } else if (url.match(/^\/category\/[^/]+\/[^/]+\/$/)) {
    // Category subpages
    return { changefreq: 'monthly', priority: '0.7' };
  }
  
  return { changefreq: 'monthly', priority: '0.7' };
}

/**
 * Parse sitemap.xml and extract URL entries
 */
function parseSitemap(content) {
  const urls = [];
  const urlRegex = /<url>([\s\S]*?)<\/url>/g;
  let match;
  
  while ((match = urlRegex.exec(content)) !== null) {
    const urlBlock = match[1];
    const locMatch = urlBlock.match(/<loc>(.*?)<\/loc>/);
    const lastmodMatch = urlBlock.match(/<lastmod>(.*?)<\/lastmod>/);
    const changefreqMatch = urlBlock.match(/<changefreq>(.*?)<\/changefreq>/);
    const priorityMatch = urlBlock.match(/<priority>(.*?)<\/priority>/);
    
    if (locMatch) {
      urls.push({
        loc: locMatch[1],
        lastmod: lastmodMatch ? lastmodMatch[1] : '',
        changefreq: changefreqMatch ? changefreqMatch[1] : '',
        priority: priorityMatch ? priorityMatch[1] : '',
        originalBlock: match[0]
      });
    }
  }
  
  return urls;
}

/**
 * Build a URL block with proper formatting (2-space indentation)
 */
function buildUrlBlock(url, lastmod, changefreq, priority, indent = '  ') {
  return `${indent}<url>
${indent}  <loc>${BASE_URL}${url}</loc>
${indent}  <lastmod>${lastmod}</lastmod>
${indent}  <changefreq>${changefreq}</changefreq>
${indent}  <priority>${priority}</priority>
${indent}</url>`;
}

/**
 * Main update function
 */
function updateSitemap() {
  console.log('🔍 Discovering index.html pages...');
  
  // Find all index.html files
  const indexFiles = findIndexFiles(REPO_ROOT);
  
  // Build discovered pages map: URL -> file path
  const discoveredPages = {};
  for (const filePath of indexFiles) {
    const url = pathToUrl(filePath);
    discoveredPages[url] = filePath;
  }
  
  console.log(`   Found ${Object.keys(discoveredPages).length} pages`);
  
  // Read existing sitemap
  console.log('📖 Reading existing sitemap.xml...');
  const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf8');
  
  // Parse existing URLs
  const existingUrls = parseSitemap(sitemapContent);
  console.log(`   Found ${existingUrls.length} existing URLs`);
  
  // Build a map of existing URLs for quick lookup
  const existingUrlMap = {};
  for (const urlData of existingUrls) {
    const urlPath = urlData.loc.replace(BASE_URL, '');
    existingUrlMap[urlPath] = urlData;
  }
  
  // Identify new URLs that need to be added
  const newUrls = [];
  for (const url in discoveredPages) {
    if (!existingUrlMap[url]) {
      const filePath = discoveredPages[url];
      const lastmod = getGitLastMod(filePath);
      const defaults = getUrlDefaults(url);
      newUrls.push({
        url,
        lastmod,
        changefreq: defaults.changefreq,
        priority: defaults.priority
      });
    }
  }
  
  console.log(`   Found ${newUrls.length} new URLs to add`);
  
  // Update existing URLs with new lastmod dates
  let updatedContent = sitemapContent;
  
  for (const url in discoveredPages) {
    if (existingUrlMap[url]) {
      const filePath = discoveredPages[url];
      const newLastmod = getGitLastMod(filePath);
      const urlData = existingUrlMap[url];
      
      // Only update lastmod in the original block, preserve exact formatting
      const lastmodRegex = /<lastmod>.*?<\/lastmod>/;
      const newBlock = urlData.originalBlock.replace(
        lastmodRegex,
        `<lastmod>${newLastmod}</lastmod>`
      );
      
      updatedContent = updatedContent.replace(urlData.originalBlock, newBlock);
    }
  }
  
  // Insert new URLs in appropriate sections
  if (newUrls.length > 0) {
    console.log('➕ Adding new URLs...');
    
    // Separate new URLs by type
    const newPlatformUrls = newUrls.filter(u => 
      u.url.match(/^\/[^/]+\/$/) && !u.url.startsWith('/category/') && u.url !== '/'
    );
    const newCategorySubpages = newUrls.filter(u => 
      u.url.match(/^\/category\/[^/]+\/[^/]+\/$/)
    );
    
    // Insert platform pages before /category/
    if (newPlatformUrls.length > 0) {
      const categoryMarker = updatedContent.indexOf('  <url>\n    <loc>https://ultratextgen.com/category/</loc>');
      if (categoryMarker !== -1) {
        const platformBlocks = newPlatformUrls.map(u => 
          buildUrlBlock(u.url, u.lastmod, u.changefreq, u.priority)
        ).join('\n\n') + '\n\n';
        
        updatedContent = updatedContent.slice(0, categoryMarker) + 
                        platformBlocks + 
                        updatedContent.slice(categoryMarker);
        
        console.log(`   Added ${newPlatformUrls.length} platform pages`);
      }
    }
    
    // Insert category subpages in the subpages section
    if (newCategorySubpages.length > 0) {
      const subpageMarker = updatedContent.indexOf('  <!-- Category subpages / group pages -->');
      if (subpageMarker !== -1) {
        // Find the position after the comment and blank line
        const insertPos = updatedContent.indexOf('\n', subpageMarker) + 1;
        
        // Get the position after the blank line
        let actualInsertPos = insertPos;
        if (updatedContent[insertPos] === '\n') {
          actualInsertPos = insertPos + 1;
        }
        
        // Find the end of existing subpages section to append there instead
        // Look for the last </url> before </urlset>
        const endMarker = updatedContent.lastIndexOf('</url>');
        if (endMarker !== -1) {
          const subpageBlocks = '\n\n' + newCategorySubpages.map(u => 
            buildUrlBlock(u.url, u.lastmod, u.changefreq, u.priority)
          ).join('\n\n');
          
          updatedContent = updatedContent.slice(0, endMarker + 6) + 
                          subpageBlocks + 
                          updatedContent.slice(endMarker + 6);
          
          console.log(`   Added ${newCategorySubpages.length} category subpages`);
        }
      }
    }
  }
  
  // Write updated sitemap
  fs.writeFileSync(SITEMAP_PATH, updatedContent, 'utf8');
  console.log('✅ Sitemap updated successfully!');
}

// Run the update
if (require.main === module) {
  try {
    updateSitemap();
  } catch (error) {
    console.error('❌ Error updating sitemap:', error.message);
    process.exit(1);
  }
}

module.exports = { updateSitemap };
