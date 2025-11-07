// assets/js/partials.js
// Inject shared partials, then run siteInit(). Prevent flash during hydration.

(function(){
  const body = document.body;
  body.classList.add("__hydrating"); // used by CSS to hold an initial fade

  async function inject(id, url){
    const host = document.getElementById(id);
    if (!host) return;
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    host.innerHTML = await res.text();
  }

  Promise.all([
    inject("site-header","/assets/partials/header.html"),
    inject("site-footer","/assets/partials/footer.html"),
    inject("privacy-host","/assets/partials/privacy.html"),
  ]).then(()=>{
    body.classList.remove("__hydrating");     // allow fade-in now
    if (typeof window.siteInit === "function") window.siteInit();
  }).catch(err=>{
    console.error("[partials] failed", err);
    body.classList.remove("__hydrating");
    if (typeof window.siteInit === "function") window.siteInit();
  });
})();

