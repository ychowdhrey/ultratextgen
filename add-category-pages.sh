#!/usr/bin/env bash
set -euo pipefail

# Creates generated category pages under ./category/
# Run this from your repo root.

mkdir -p category/bold-fonts/bold
mkdir -p category/bold-fonts/italic
mkdir -p category/bold-fonts/bold-italic
mkdir -p category/bold-fonts/alternating
mkdir -p category/cursive-fonts/script
mkdir -p category/gothic-fonts/fraktur
mkdir -p category/bubble-fonts/circle
mkdir -p category/special-fonts/lines
mkdir -p category/special-fonts/effects

cat > category/bold-fonts/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Bold & Italic Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › Bold &amp; Italic
    </nav>
    <h1>Bold &amp; Italic Fonts</h1>
    <p>Bold and italic Unicode fonts you can copy and paste.</p>
  </header>

  <main class="container">
    <section id="family-intro" class="section">
      <div class="section-body">
        <p>Browse the bold &amp; italic family. Click a style to copy, or use the platform filter to view platform-compatible styles.</p>
      </div>
    </section>

    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <!-- Load site registry + renderer -->
  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'bold-italic'; // CATEGORY_PAGES key for this page
      const grid = document.getElementById('resultsGrid');

      function safeAttr(str) {
        return String(str || "").replace(/"/g, "&quot;");
      }

      function createStyleCard(name, convertedText, decoratedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        const fullText = decoratedText || convertedText;
        const safeText = safeAttr(fullText);
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" data-text="${safeText}" ${!fullText ? 'disabled' : ''}>Copy</button>
        `;
        card.querySelector('.copy-btn')?.addEventListener('click', async (e) => {
          const t = e.currentTarget.dataset.text || '';
          try {
            await navigator.clipboard.writeText(t);
            e.currentTarget.textContent = '✓ Copied';
            setTimeout(()=> e.currentTarget.textContent = 'Copy', 1500);
          } catch (err) {
            console.error('Copy failed', err);
          }
        });
        return card;
      }

      const styles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const sampleText = 'UltraTextGen';

      styles.forEach(s => {
        const converted = (window.Render && typeof window.Render.renderAny === 'function')
          ? window.Render.renderAny(sampleText, s)
          : sampleText;
        grid.appendChild(createStyleCard(s.name, converted, null));
      });

      if (styles.length === 0) {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this family.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

cat > category/bold-fonts/bold/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Bold — Bold &amp; Italic Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › <a href="/category/bold-fonts">Bold &amp; Italic</a> › Bold
    </nav>
    <h1>Bold (group)</h1>
    <p>All bold styles in the Bold &amp; Italic family.</p>
  </header>

  <main class="container">
    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'bold-italic';
      const groupSlug = 'bold';
      const grid = document.getElementById('resultsGrid');

      function createStyleCard(name, convertedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" ${!convertedText ? 'disabled' : ''}>Copy</button>
        `;
        const btn = card.querySelector('.copy-btn');
        if (btn && convertedText) {
          btn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(convertedText);
              btn.textContent = '✓ Copied';
              setTimeout(()=> btn.textContent = 'Copy', 1500);
            } catch (err) { console.error(err); }
          });
        }
        return card;
      }

      const allStyles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const groupStyles = allStyles.filter(s => s.groupSlug === groupSlug);

      const sampleText = 'UltraTextGen';
      if (groupStyles.length) {
        groupStyles.forEach(s => {
          const converted = (window.Render && typeof window.Render.renderAny === 'function')
            ? window.Render.renderAny(sampleText, s)
            : sampleText;
          grid.appendChild(createStyleCard(s.name, converted));
        });
      } else {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this group.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

cat > category/bold-fonts/italic/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Italic — Bold &amp; Italic Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › <a href="/category/bold-fonts">Bold &amp; Italic</a> › Italic
    </nav>
    <h1>Italic (group)</h1>
    <p>All italic styles in the Bold &amp; Italic family.</p>
  </header>

  <main class="container">
    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'bold-italic';
      const groupSlug = 'italic';
      const grid = document.getElementById('resultsGrid');

      function createStyleCard(name, convertedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" ${!convertedText ? 'disabled' : ''}>Copy</button>
        `;
        const btn = card.querySelector('.copy-btn');
        if (btn && convertedText) {
          btn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(convertedText);
              btn.textContent = '✓ Copied';
              setTimeout(()=> btn.textContent = 'Copy', 1500);
            } catch (err) { console.error(err); }
          });
        }
        return card;
      }

      const allStyles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const groupStyles = allStyles.filter(s => s.groupSlug === groupSlug);

      const sampleText = 'UltraTextGen';
      if (groupStyles.length) {
        groupStyles.forEach(s => {
          const converted = (window.Render && typeof window.Render.renderAny === 'function')
            ? window.Render.renderAny(sampleText, s)
            : sampleText;
          grid.appendChild(createStyleCard(s.name, converted));
        });
      } else {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this group.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

cat > category/bold-fonts/bold-italic/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Bold-Italic — Bold &amp; Italic Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › <a href="/category/bold-fonts">Bold &amp; Italic</a> › Bold-Italic
    </nav>
    <h1>Bold-Italic (group)</h1>
    <p>Mixed bold &amp; italic serif styles.</p>
  </header>

  <main class="container">
    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'bold-italic';
      const groupSlug = 'bold-italic';
      const grid = document.getElementById('resultsGrid');

      function createStyleCard(name, convertedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" ${!convertedText ? 'disabled' : ''}>Copy</button>
        `;
        const btn = card.querySelector('.copy-btn');
        if (btn && convertedText) {
          btn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(convertedText);
              btn.textContent = '✓ Copied';
              setTimeout(()=> btn.textContent = 'Copy', 1500);
            } catch (err) { console.error(err); }
          });
        }
        return card;
      }

      const allStyles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const groupStyles = allStyles.filter(s => s.groupSlug === groupSlug);

      const sampleText = 'UltraTextGen';
      if (groupStyles.length) {
        groupStyles.forEach(s => {
          const converted = (window.Render && typeof window.Render.renderAny === 'function')
            ? window.Render.renderAny(sampleText, s)
            : sampleText;
          grid.appendChild(createStyleCard(s.name, converted));
        });
      } else {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this group.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

cat > category/bold-fonts/alternating/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Alternating — Bold &amp; Italic Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › <a href="/category/bold-fonts">Bold &amp; Italic</a> › Alternating
    </nav>
    <h1>Alternating (group)</h1>
    <p>Alternating styles in the Bold &amp; Italic family.</p>
  </header>

  <main class="container">
    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'bold-italic';
      const groupSlug = 'alternating';
      const grid = document.getElementById('resultsGrid');

      function createStyleCard(name, convertedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" ${!convertedText ? 'disabled' : ''}>Copy</button>
        `;
        const btn = card.querySelector('.copy-btn');
        if (btn && convertedText) {
          btn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(convertedText);
              btn.textContent = '✓ Copied';
              setTimeout(()=> btn.textContent = 'Copy', 1500);
            } catch (err) { console.error(err); }
          });
        }
        return card;
      }

      const allStyles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const groupStyles = allStyles.filter(s => s.groupSlug === groupSlug);

      const sampleText = 'UltraTextGen';
      if (groupStyles.length) {
        groupStyles.forEach(s => {
          const converted = (window.Render && typeof window.Render.renderAny === 'function')
            ? window.Render.renderAny(sampleText, s)
            : sampleText;
          grid.appendChild(createStyleCard(s.name, converted));
        });
      } else {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this group.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

cat > category/cursive-fonts/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Cursive Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › Cursive
    </nav>
    <h1>Cursive Fonts</h1>
    <p>Elegant cursive and script Unicode fonts.</p>
  </header>

  <main class="container">
    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'cursive';
      const grid = document.getElementById('resultsGrid');

      function safeAttr(str) {
        return String(str || "").replace(/"/g, "&quot;");
      }

      function createStyleCard(name, convertedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        const safeText = safeAttr(convertedText || 'UltraTextGen');
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" data-text="${safeText}" ${!convertedText ? 'disabled' : ''}>Copy</button>
        `;
        card.querySelector('.copy-btn')?.addEventListener('click', async (e) => {
          const t = e.currentTarget.dataset.text || '';
          try {
            await navigator.clipboard.writeText(t);
            e.currentTarget.textContent = '✓ Copied';
            setTimeout(()=> e.currentTarget.textContent = 'Copy', 1500);
          } catch (err) { console.error(err); }
        });
        return card;
      }

      const styles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const sampleText = 'UltraTextGen';
      styles.forEach(s => {
        const converted = (window.Render && typeof window.Render.renderAny === 'function')
          ? window.Render.renderAny(sampleText, s)
          : sampleText;
        grid.appendChild(createStyleCard(s.name, converted));
      });

      if (styles.length === 0) {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this family.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

cat > category/cursive-fonts/script/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Script — Cursive Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › <a href="/category/cursive-fonts">Cursive</a> › Script
    </nav>
    <h1>Script (group)</h1>
    <p>Script and cursive styles.</p>
  </header>

  <main class="container">
    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'cursive';
      const groupSlug = 'script';
      const grid = document.getElementById('resultsGrid');

      function createStyleCard(name, convertedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" ${!convertedText ? 'disabled' : ''}>Copy</button>
        `;
        const btn = card.querySelector('.copy-btn');
        if (btn && convertedText) {
          btn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(convertedText);
              btn.textContent = '✓ Copied';
              setTimeout(()=> btn.textContent = 'Copy', 1500);
            } catch (err) { console.error(err); }
          });
        }
        return card;
      }

      const allStyles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const groupStyles = allStyles.filter(s => s.groupSlug === groupSlug);

      const sampleText = 'UltraTextGen';
      if (groupStyles.length) {
        groupStyles.forEach(s => {
          const converted = (window.Render && typeof window.Render.renderAny === 'function')
            ? window.Render.renderAny(sampleText, s)
            : sampleText;
          grid.appendChild(createStyleCard(s.name, converted));
        });
      } else {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this group.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

cat > category/gothic-fonts/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Gothic Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › Gothic
    </nav>
    <h1>Gothic Fonts</h1>
    <p>Dark gothic and fraktur Unicode fonts.</p>
  </header>

  <main class="container">
    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'gothic';
      const grid = document.getElementById('resultsGrid');

      function safeAttr(str) {
        return String(str || "").replace(/"/g, "&quot;");
      }

      function createStyleCard(name, convertedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        const safeText = safeAttr(convertedText || 'UltraTextGen');
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" data-text="${safeText}" ${!convertedText ? 'disabled' : ''}>Copy</button>
        `;
        card.querySelector('.copy-btn')?.addEventListener('click', async (e) => {
          const t = e.currentTarget.dataset.text || '';
          try {
            await navigator.clipboard.writeText(t);
            e.currentTarget.textContent = '✓ Copied';
            setTimeout(()=> e.currentTarget.textContent = 'Copy', 1500);
          } catch (err) { console.error(err); }
        });
        return card;
      }

      const styles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const sampleText = 'UltraTextGen';
      styles.forEach(s => {
        const converted = (window.Render && typeof window.Render.renderAny === 'function')
          ? window.Render.renderAny(sampleText, s)
          : sampleText;
        grid.appendChild(createStyleCard(s.name, converted));
      });

      if (styles.length === 0) {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this family.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

cat > category/gothic-fonts/fraktur/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Fraktur — Gothic Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › <a href="/category/gothic-fonts">Gothic</a> › Fraktur
    </nav>
    <h1>Fraktur (group)</h1>
    <p>Fraktur and old-English styles.</p>
  </header>

  <main class="container">
    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'gothic';
      const groupSlug = 'fraktur';
      const grid = document.getElementById('resultsGrid');

      function createStyleCard(name, convertedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" ${!convertedText ? 'disabled' : ''}>Copy</button>
        `;
        const btn = card.querySelector('.copy-btn');
        if (btn && convertedText) {
          btn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(convertedText);
              btn.textContent = '✓ Copied';
              setTimeout(()=> btn.textContent = 'Copy', 1500);
            } catch (err) { console.error(err); }
          });
        }
        return card;
      }

      const allStyles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const groupStyles = allStyles.filter(s => s.groupSlug === groupSlug);

      const sampleText = 'UltraTextGen';
      if (groupStyles.length) {
        groupStyles.forEach(s => {
          const converted = (window.Render && typeof window.Render.renderAny === 'function')
            ? window.Render.renderAny(sampleText, s)
            : sampleText;
          grid.appendChild(createStyleCard(s.name, converted));
        });
      } else {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this group.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

cat > category/bubble-fonts/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Bubble Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › Bubble
    </nav>
    <h1>Bubble Fonts</h1>
    <p>Fun bubble and circle Unicode fonts.</p>
  </header>

  <main class="container">
    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'bubble';
      const grid = document.getElementById('resultsGrid');

      function safeAttr(str) {
        return String(str || "").replace(/"/g, "&quot;");
      }

      function createStyleCard(name, convertedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        const safeText = safeAttr(convertedText || 'UltraTextGen');
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" data-text="${safeText}" ${!convertedText ? 'disabled' : ''}>Copy</button>
        `;
        card.querySelector('.copy-btn')?.addEventListener('click', async (e) => {
          const t = e.currentTarget.dataset.text || '';
          try {
            await navigator.clipboard.writeText(t);
            e.currentTarget.textContent = '✓ Copied';
            setTimeout(()=> e.currentTarget.textContent = 'Copy', 1500);
          } catch (err) { console.error(err); }
        });
        return card;
      }

      const styles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const sampleText = 'UltraTextGen';
      styles.forEach(s => {
        const converted = (window.Render && typeof window.Render.renderAny === 'function')
          ? window.Render.renderAny(sampleText, s)
          : sampleText;
        grid.appendChild(createStyleCard(s.name, converted));
      });

      if (styles.length === 0) {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this family.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

cat > category/bubble-fonts/circle/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Circle — Bubble Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › <a href="/category/bubble-fonts">Bubble</a> › Circle
    </nav>
    <h1>Circle (group)</h1>
    <p>Circle and bubble styles.</p>
  </header>

  <main class="container">
    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'bubble';
      const groupSlug = 'circle';
      const grid = document.getElementById('resultsGrid');

      function createStyleCard(name, convertedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" ${!convertedText ? 'disabled' : ''}>Copy</button>
        `;
        const btn = card.querySelector('.copy-btn');
        if (btn && convertedText) {
          btn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(convertedText);
              btn.textContent = '✓ Copied';
              setTimeout(()=> btn.textContent = 'Copy', 1500);
            } catch (err) { console.error(err); }
          });
        }
        return card;
      }

      const allStyles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const groupStyles = allStyles.filter(s => s.groupSlug === groupSlug);

      const sampleText = 'UltraTextGen';
      if (groupStyles.length) {
        groupStyles.forEach(s => {
          const converted = (window.Render && typeof window.Render.renderAny === 'function')
            ? window.Render.renderAny(sampleText, s)
            : sampleText;
          grid.appendChild(createStyleCard(s.name, converted));
        });
      } else {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this group.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

cat > category/special-fonts/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Special Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › Special
    </nav>
    <h1>Special Fonts</h1>
    <p>Unique decorative Unicode fonts and effects.</p>
  </header>

  <main class="container">
    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'special';
      const grid = document.getElementById('resultsGrid');

      function safeAttr(str) {
        return String(str || "").replace(/"/g, "&quot;");
      }

      function createStyleCard(name, convertedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        const safeText = safeAttr(convertedText || 'UltraTextGen');
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" data-text="${safeText}" ${!convertedText ? 'disabled' : ''}>Copy</button>
        `;
        card.querySelector('.copy-btn')?.addEventListener('click', async (e) => {
          const t = e.currentTarget.dataset.text || '';
          try {
            await navigator.clipboard.writeText(t);
            e.currentTarget.textContent = '✓ Copied';
            setTimeout(()=> e.currentTarget.textContent = 'Copy', 1500);
          } catch (err) { console.error(err); }
        });
        return card;
      }

      const styles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const sampleText = 'UltraTextGen';
      styles.forEach(s => {
        const converted = (window.Render && typeof window.Render.renderAny === 'function')
          ? window.Render.renderAny(sampleText, s)
          : sampleText;
        grid.appendChild(createStyleCard(s.name, converted));
      });

      if (styles.length === 0) {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this family.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

cat > category/special-fonts/lines/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Lines — Special Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › <a href="/category/special-fonts">Special</a> › Lines
    </nav>
    <h1>Lines (group)</h1>
    <p>Strikethrough, underline, and line effects.</p>
  </header>

  <main class="container">
    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'special';
      const groupSlug = 'lines';
      const grid = document.getElementById('resultsGrid');

      function createStyleCard(name, convertedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" ${!convertedText ? 'disabled' : ''}>Copy</button>
        `;
        const btn = card.querySelector('.copy-btn');
        if (btn && convertedText) {
          btn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(convertedText);
              btn.textContent = '✓ Copied';
              setTimeout(()=> btn.textContent = 'Copy', 1500);
            } catch (err) { console.error(err); }
          });
        }
        return card;
      }

      const allStyles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const groupStyles = allStyles.filter(s => s.groupSlug === groupSlug);

      const sampleText = 'UltraTextGen';
      if (groupStyles.length) {
        groupStyles.forEach(s => {
          const converted = (window.Render && typeof window.Render.renderAny === 'function')
            ? window.Render.renderAny(sampleText, s)
            : sampleText;
          grid.appendChild(createStyleCard(s.name, converted));
        });
      } else {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this group.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

cat > category/special-fonts/effects/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Effects — Special Fonts — UltraTextGen</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/">UltraTextGen</a> › <a href="/category">Fonts</a> › <a href="/category/special-fonts">Special</a> › Effects
    </nav>
    <h1>Effects (group)</h1>
    <p>Decorative effects like wavy and other symbol-based decorations.</p>
  </header>

  <main class="container">
    <section id="styles-grid" class="section">
      <div id="resultsGrid" class="results-grid"></div>
    </section>
  </main>

  <footer class="site-footer">
    <div>© UltraTextGen</div>
  </footer>

  <script src="/styles.js"></script>
  <script src="/renderer.js"></script>

  <script>
    (function () {
      const familySlug = 'special';
      const groupSlug = 'effects';
      const grid = document.getElementById('resultsGrid');

      function createStyleCard(name, convertedText) {
        const card = document.createElement('div');
        card.className = 'style-card';
        card.innerHTML = `
          <div class="style-info">
            <p class="style-name">${name}</p>
            <p class="style-preview ${!convertedText ? 'placeholder' : ''}">${convertedText || 'UltraTextGen'}</p>
          </div>
          <button class="copy-btn" ${!convertedText ? 'disabled' : ''}>Copy</button>
        `;
        const btn = card.querySelector('.copy-btn');
        if (btn && convertedText) {
          btn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(convertedText);
              btn.textContent = '✓ Copied';
              setTimeout(()=> btn.textContent = 'Copy', 1500);
            } catch (err) { console.error(err); }
          });
        }
        return card;
      }

      const allStyles = (window.StyleRegistry && window.StyleRegistry.getStylesByFamilySlug)
        ? window.StyleRegistry.getStylesByFamilySlug(familySlug)
        : [];

      const groupStyles = allStyles.filter(s => s.groupSlug === groupSlug);

      const sampleText = 'UltraTextGen';
      if (groupStyles.length) {
        groupStyles.forEach(s => {
          const converted = (window.Render && typeof window.Render.renderAny === 'function')
            ? window.Render.renderAny(sampleText, s)
            : sampleText;
          grid.appendChild(createStyleCard(s.name, converted));
        });
      } else {
        grid.innerHTML = '<div class="style-card"><div class="style-info"><p class="style-preview placeholder">No styles found in this group.</p></div></div>';
      }
    })();
  </script>
</body>
</html>
EOF

echo "Created category pages under ./category/ — run git add/commit as described in instructions."
