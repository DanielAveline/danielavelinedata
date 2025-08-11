<script>
// Fetch & inject the shared partials, then run site init.
(async function () {
  async function inject(id, url) {
    const host = document.getElementById(id);
    if (!host) return;
    const res = await fetch(url, { cache: 'no-cache' });
    host.innerHTML = await res.text();
  }

  await Promise.all([
    inject('site-header',  '/assets/partials/header.html'),
    inject('site-footer',  '/assets/partials/footer.html'),
    inject('privacy-host', '/assets/partials/privacy.html'),
  ]);

  // Run global wiring after partials exist
  if (window.siteInit) window.siteInit();
})();
</script>
