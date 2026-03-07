# CLAUDE.md — UltraTextGen Codebase Guide

This file provides context for AI assistants working in this repository. Read it before making changes.

---

## Project Overview

**UltraTextGen** is a fast, zero-framework Unicode text generator. It converts plain text into stylized Unicode fonts that work across social platforms (LinkedIn, Instagram, Discord, etc.). The tool runs entirely in the browser with no backend, no build step, and no runtime dependencies.

**Core philosophy**: Fast > Fancy, Clean > Clever, Useful > Impressive.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Pure HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Build tools | Node.js (sitemap gen only), Python (tweet queue only) |
| CI/CD | GitHub Actions |
| Hosting | Static site (Netlify, inferred from `_redirects`) |
| Analytics | Google Tag Manager (GTM-P55HXK8Q) |

**There are no frontend frameworks** (no React, Vue, Angular, etc.) and no bundlers (no Webpack, Vite, Rollup). Do not introduce them.

---

## Repository Structure

```
ultratextgen/
├── index.html              # Main homepage (733 lines)
├── style.css               # Global stylesheet (1980 lines)
├── script.js               # UI/DOM logic, main IIFE (825 lines)
├── styles.js               # Unicode font registry (836 lines)
├── renderer.js             # Text rendering engine (459 lines)
├── header.js               # Shared header injector (67 lines)
├── symbol-explorer.js      # Symbol lookup utility
├── symbol-explorer.css     # Symbol explorer styles
├── package.json            # npm metadata + build scripts
├── fonts.json              # Font category mappings
├── robots.txt              # Search engine directives
├── sitemap.xml             # Auto-generated (do not edit manually)
├── _redirects              # Netlify redirect rules
│
├── .github/workflows/
│   ├── tweet-queue.yml     # Daily social queue (09:00 UTC)
│   └── update-sitemap.yml  # Daily sitemap regen (00:00 UTC)
│
├── scripts/
│   ├── update-sitemap.js   # Sitemap generator (Node.js)
│   ├── inject-faq-jsonld.js# FAQ structured data injector
│   └── tweet_queue.py      # Git-to-tweet automation (Python)
│
├── category/               # Category landing pages (bold, cursive, etc.)
├── usecase/                # Use case pages (bio, comment, etc.)
├── guide/                  # Educational article pages
├── library/                # Symbol/emoji reference libraries
├── js/vertical/            # Vertical text feature module
│
└── Platform pages:
    discord/ facebook/ instagram/ linkedin/ pinterest/
    snapchat/ telegram/ tiktok/ whatsapp/ x/ youtube/
```

---

## Core JavaScript Architecture

Scripts are loaded in a strict order in every HTML page:

```html
<script src="/header.js"></script>      <!-- 1. Inject shared nav -->
<script src="/styles.js"></script>      <!-- 2. Register font styles -->
<script src="/renderer.js"></script>    <!-- 3. Rendering engine -->
<script src="/script.js" defer></script><!-- 4. UI logic -->
```

### Module Descriptions

#### `header.js`
- IIFE that creates and injects the shared navigation header
- Looks for `#shared-header` element or inserts after GTM noscript
- Manages dark mode toggle + localStorage persistence

#### `styles.js`
- Defines `window.textStyles` — the global Unicode font registry
- Each style maps A–Z, a–z, 0–9 to Unicode equivalents
- Defines `CATEGORY_PAGES` and `SITE_PAGES` routing objects
- Style object shape:
  ```js
  {
    upper: { A: '𝗔', B: '𝗕', ... },
    lower: { a: '𝗮', b: '𝗯', ... },
    nums:  { 0: '𝟬', 1: '𝟭', ... },
    type: 'map',           // 'map' | 'zalgo' | 'upside-down' | 'transform'
    category: 'bold',
    familySlug: 'bold-fonts',
    groupSlug: 'bold'
  }
  ```

#### `renderer.js`
- Exports `window.UltraTextGenRender` with main method `renderAny(text, styleKey, options)`
- Handles rendering types:
  - **`map`**: Character-by-character Unicode substitution
  - **`zalgo`**: Glitch text with stacked diacritics
  - **`upside-down`**: Text reversal + character flipping with fallback modes
  - **`transform`**: Custom transforms (backwards, smallCaps, mirror)

#### `script.js`
- Main IIFE wrapping all UI state and event logic
- Utility helpers: `$()` (querySelector) and `$$()` (querySelectorAll)
- Manages: input textarea, output grid, decorations (symbols, frames, dividers)
- Copy to clipboard via Clipboard API with visual toast feedback
- Real-time rendering as user types
- Style filtering/search (client-side)
- localStorage for recent selections and dark mode preference
- Query param `?q=text` for shareable URLs

#### `js/vertical/`
- Self-contained module for vertical text generation
- Files: `verticalPageController.js`, `verticalLayouts.js`, `verticalDecorators.js`, `verticalDecoratorData.js`
- Has its own manual test page: `verticalLayouts.test.html`

---

## HTML Page Conventions

All pages follow this structure and must maintain:

1. **Google Tag Manager** snippet in `<head>` and `<body>`
2. **Canonical URL** meta tag
3. **OpenGraph + Twitter Card** meta tags
4. **JSON-LD structured data** (FAQPage, WebSite, Organization, BreadcrumbList)
5. **Script load order**: header → styles → renderer → script (with `defer` on script.js)
6. **Dark mode support** via class on `<html>` element

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- GTM, canonical, OG/Twitter meta -->
  <!-- JSON-LD structured data -->
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <!-- GTM noscript -->
  <div id="shared-header"></div>
  <!-- Page content -->
  <script src="/header.js"></script>
  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>
  <script src="/script.js" defer></script>
</body>
</html>
```

---

## CSS Conventions

- **Custom properties (CSS variables)** for all colors/theme tokens — required for dark mode
- **CSS Grid + Flexbox** for layout
- **Mobile-first** responsive design
- **Class naming**: hyphen-separated (e.g., `hero-headline`, `decoration-section`, `style-card`)
- **Dark mode**: toggled by adding `dark` class to `<html>`, not via `prefers-color-scheme` media query
- Do not use inline styles or `!important` unless absolutely necessary

---

## JavaScript Conventions

- **All modules use IIFE pattern**: `(function () { "use strict"; ... })();`
- **Globals**: Only `window.textStyles` and `window.UltraTextGenRender` are intentional globals
- **DOM helpers**: Use `$()` and `$$()` wrappers defined in `script.js`
- **Naming**: camelCase for variables/functions, SCREAMING_SNAKE_CASE for constants
- **No `var`**: Use `const` and `let` only
- **No external libraries** in frontend code — use native Web APIs (Clipboard API, fetch, localStorage, Intl)
- **No ES modules** (`import`/`export`) — scripts use global scope communication intentionally

---

## Adding New Unicode Styles

To add a new text style, edit `styles.js`:

1. Add an entry to `window.textStyles` with the shape shown above
2. Map all 26 uppercase letters (`A`–`Z`), 26 lowercase (`a`–`z`), and 10 digits (`0`–`9`)
3. Set `type: 'map'` for standard character substitution
4. Assign `category`, `familySlug`, and `groupSlug` that match existing category pages
5. Characters that have no Unicode equivalent should be omitted (the renderer falls back to the original character)

---

## Adding New Pages

### Platform page (e.g., a new social network)
1. Create `/<platform>/index.html` following the existing platform page structure
2. Update `SITE_PAGES` in `styles.js`
3. Add to the sitemap (auto-generated on next workflow run)
4. Add redirect if needed in `_redirects`

### Category page
1. Create `/category/<slug>/index.html`
2. Update `CATEGORY_PAGES` in `styles.js`
3. Assign matching `familySlug` values in relevant styles

---

## Build & Development

### Running locally
```bash
# No build step required — open index.html directly in a browser
# OR serve with any static file server:
npx serve .
python3 -m http.server 8080
```

### Sitemap regeneration
```bash
npm run prebuild   # Generates sitemap.xml
npm run build      # Same as prebuild (no other build step)
```

### Dependencies (build-time only)
```bash
npm install        # Installs cheerio (HTML parsing) and glob (file discovery)
```

---

## Automated Workflows

### `update-sitemap.yml`
- **Schedule**: Daily at 00:00 UTC
- **Action**: Runs `scripts/update-sitemap.js`, auto-commits `sitemap.xml` with `[skip ci]`
- **Do not** edit `sitemap.xml` manually — it will be overwritten

### `tweet-queue.yml`
- **Schedule**: Daily at 09:00 UTC (also triggerable manually)
- **Action**: Runs `scripts/tweet_queue.py`, posts qualifying commits as GitHub Issue comments
- Confidence threshold: 0.72 (favors HTML/CSS/guide changes; ignores lock files, lint, tests)

---

## SEO & Structured Data

Every page includes JSON-LD for:
- `WebApplication` or `WebSite` (homepage)
- `Organization`
- `BreadcrumbList`
- `FAQPage` (where applicable)

When editing page content, preserve and update the JSON-LD structured data to match. Use schema.org vocabulary.

---

## Testing

There is no automated test framework. Testing is manual and browser-based:
- `js/vertical/verticalLayouts.test.html` — manual test page for vertical layout module
- Test changes by opening HTML files in a browser

Do not add a test framework unless explicitly requested.

---

## Git Workflow

- **Commit style**: Conventional commits (`feat:`, `fix:`, `chore:`, `UX:`)
- **PRs**: All changes go through pull requests; direct pushes to `master` are avoided
- **Branch naming**: `claude/<description>-<session-id>` for AI-generated branches
- **CI tags**: Use `[skip ci]` in auto-generated commit messages to prevent circular workflows
- **`sitemap.xml`**: Never manually edit — always auto-generated

---

## What NOT to Do

- Do not add npm packages that run in the browser
- Do not introduce a JavaScript framework or bundler
- Do not edit `sitemap.xml` directly
- Do not add `var` declarations — use `const`/`let`
- Do not use `import`/`export` ES module syntax in frontend scripts
- Do not bypass the IIFE module pattern for new JavaScript files
- Do not hardcode color values in CSS — use the existing custom property tokens
- Do not add inline `<style>` blocks to HTML pages — add to `style.css`
- Do not skip Google Tag Manager snippets when creating new pages
- Do not skip JSON-LD structured data when creating new pages
