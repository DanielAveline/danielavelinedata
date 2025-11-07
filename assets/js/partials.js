<script>
// assets/js/partials.js

(function () {
  const headerEl = document.getElementById('site-header');

  function appendSqlLinks(nav) {
    if (!nav) return;
    const ensure = (href, text) => {
      let a = nav.querySelector(`a[href="${href}"]`);
      if (!a) {
        a = document.createElement('a');
        a.href = href;
        a.textContent = text;
        nav.appendChild(a);
      }
      return a;
    };
    const a1 = ensure('/sql/puzzles.html', 'SQL Puzzles');
    const a2 = ensure('/sql/lab.html', 'SQL Lab');

    // Active state
    const path = location.pathname;
    if (path.startsWith('/sql/')) {
      a1.classList.add('is-active');
      a2.classList.add('is-active');
    } else {
      const current = nav.querySelector(`a[href="${path}"]`);
      if (current) current.classList.add('is-active');
    }
  }

  function renderFallbackHeader() {
    // Minimal, generic header. It won’t alter your page styles if
    // you already have a header; we only use it as a fallback.
    headerEl.innerHTML = `
      <div class="wrap" style="max-width:1200px;margin:0 auto;padding:1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;">
        <div class="brand" style="font-weight:700;"><a href="/" style="text-decoration:none;color:inherit">Daniel Aveline</a></div>
        <nav aria-label="Primary" style="display:flex;gap:1rem;flex-wrap:wrap;">
          <a href="/">Home</a>
          <a href="/aboutme.html">About</a>
          <a href="/experience.html">Experience</a>
          <a href="/education.html">Education</a>
          <a href="/contact.html">Contact</a>
        </nav>
      </div>
    `;
  }

  function ensureHeader() {
    if (!headerEl) return;

    // If your site (or older partials.js) already put a header/nav in place,
    // leave it alone and just add the SQL links.
    let nav = headerEl.querySelector('nav');

    if (!nav || !nav.children.length) {
      // No existing header/nav -> render a simple fallback, then get its <nav>
      renderFallbackHeader();
      nav = headerEl.querySelector('nav');
    }

    appendSqlLinks(nav);
  }

  // Optional simple footer if you use #site-footer (does nothing if you already render one)
  function ensureFooter() {
    const footerEl = document.getElementById('site-footer');
    if (!footerEl) return;
    if (footerEl.children.length) return; // something already rendered it
    footerEl.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:2rem 1rem;opacity:.7;">
        <div>© ${new Date().getFullYear()} Daniel Aveline</div>
      </div>
    `;
  }

  // Run after DOM is ready (and also once in case this file is late-loaded)
  const run = () => { ensureHeader(); ensureFooter(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
</script>
