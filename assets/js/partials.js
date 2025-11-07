/**
 * Header/Footer enhancer (non-destructive)
 * - Does NOT replace your existing header/footer markup or styles.
 * - Appends SQL links into an existing <nav> inside #site-header.
 * - Adds 'is-active' class on /sql/* pages (relies on your existing CSS).
 */
(function () {
  const headerEl = document.getElementById('site-header');
  if (headerEl) {
    const enhance = () => {
      const nav = headerEl.querySelector('nav');
      if (!nav) return;
      const ensureLink = (href, text, sqlFlag=true) => {
        let a = nav.querySelector(`a[href="${href}"]`);
        if (!a) {
          a = document.createElement('a');
          a.href = href;
          a.textContent = text;
          if (sqlFlag) a.dataset.sql = "true";
          nav.appendChild(a);
        }
        return a;
      };
      const linkPuzzles = ensureLink('/sql/puzzles.html', 'SQL Puzzles');
      const linkLab     = ensureLink('/sql/lab.html',     'SQL Lab');
      const path = location.pathname;
      if (path.startsWith('/sql/')) {
        [linkPuzzles, linkLab].forEach(a => a.classList.add('is-active'));
      } else {
        const current = nav.querySelector(`a[href="${path}"]`);
        if (current) current.classList.add('is-active');
      }
    };
    setTimeout(enhance, 0);
    document.addEventListener('DOMContentLoaded', enhance, { once: true });
  }
})();