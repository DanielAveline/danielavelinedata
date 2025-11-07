/**
 * Drop-in header/footer injector.
 * Renders a consistent header with nav (including SQL pages) and a simple footer.
 * Auto-highlights SQL links when on /sql/* pages.
 */
(function () {
  const headerEl = document.getElementById('site-header');
  if (headerEl) {
    headerEl.innerHTML = `
      <style>
        /* Minimal active state without touching global CSS */
        #site-header nav a.is-active { font-weight: 600; text-decoration: underline; }
        #site-header { background: transparent; }
        #site-header .wrap { max-width: 1200px; margin: 0 auto; padding: 1rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; }
        #site-header .brand { font-weight: 700; font-size: 1.1rem; }
        #site-header nav { display:flex; gap: 1rem; flex-wrap: wrap; }
        #site-header nav a { text-decoration: none; color: inherit; padding: .25rem .5rem; border-radius:.4rem; }
        #site-header nav a:hover { background: rgba(0,0,0,.05); }
      </style>
      <div class="wrap">
        <div class="brand"><a href="/">Daniel Aveline</a></div>
        <nav aria-label="Primary">
          <a href="/">Home</a>
          <a href="/aboutme.html">About</a>
          <a href="/experience.html">Experience</a>
          <a href="/education.html">Education</a>
          <a href="/contact.html">Contact</a>
          <a href="/sql/puzzles.html" data-sql>SQL Puzzles</a>
          <a href="/sql/lab.html" data-sql>SQL Lab</a>
        </nav>
      </div>
    `;

    // Auto-highlight SQL links on /sql/* routes
    (function () {
      const path = location.pathname;
      const links = headerEl.querySelectorAll('nav a');
      links.forEach(a => {
        const href = a.getAttribute('href') || '';
        if (href && href === path) a.classList.add('is-active');
        if (path.startsWith('/sql/') && a.hasAttribute('data-sql')) {
          a.classList.add('is-active');
        }
      });
    })();
  }

  // Optional simple footer if you use #site-footer
  const footerEl = document.getElementById('site-footer');
  if (footerEl && !footerEl.dataset.rendered) {
    footerEl.dataset.rendered = "true";
    footerEl.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:2rem 1rem;opacity:.7;">
        <div>© ${new Date().getFullYear()} Daniel Aveline</div>
      </div>
    `;
  }
})();
