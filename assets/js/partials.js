// assets/js/partials.js
// Fetch & inject shared partials, then run siteInit()

(async function () {
  function log(msg, ...args){ console.log(`[partials] ${msg}`, ...args); }
  async function inject(id, url) {
    const host = document.getElementById(id);
    if (!host) { log(`Host #${id} not found`); return; }
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      host.innerHTML = await res.text();
      log(`Injected ${id} from ${url}`);
    } catch (e) {
      console.error(`[partials] Failed to inject ${id} from ${url}`, e);
    }
  }

  await Promise.all([
    inject("site-header",  "/assets/partials/header.html"),
    inject("site-footer",  "/assets/partials/footer.html"),
    inject("privacy-host", "/assets/partials/privacy.html"),
  ]);

  if (typeof window.siteInit === "function") {
    log("Running siteInit()");
    window.siteInit();
  } else {
    console.warn("[partials] siteInit() not found");
  }
})();

