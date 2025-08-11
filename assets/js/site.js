// assets/js/site.js
// Global site wiring: active nav link, privacy modal, cookie consent, smooth nav.

window.siteInit = function () {
  // ===== Active nav highlighting =====
  function normalize(path) {
    if (!path || path === "/") return "/aboutme.html";
    path = path.replace(/\/+$/, "");
    if (path.toLowerCase().endsWith("/index.html")) return "/aboutme.html";
    return path;
  }
  const current = normalize(location.pathname);
  document.querySelectorAll("nav a[data-nav]").forEach(a => {
    const href = normalize(a.getAttribute("href") || "");
    if (href === current) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  // ===== Smooth cross-fade between pages + prefetch =====
  const body = document.body;

  // Enter transition on load
  body.classList.add("__fade-enter");
  requestAnimationFrame(() => {
    body.classList.add("__fade-ready");
    body.classList.remove("__fade-enter");
  });

  // Intercept same-origin nav clicks, fade out, then navigate
  function sameOrigin(href) {
    try { return new URL(href, location.href).origin === location.origin; }
    catch { return false; }
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    if (a.target && a.target !== "_self") return;     // new tab/window
    if (a.hasAttribute("download")) return;           // downloads
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#")) return;        // anchors
    if (!sameOrigin(a.href)) return;                  // external links

    e.preventDefault();
    body.classList.add("__fade-leave");
    setTimeout(() => { location.href = a.href; }, 160);
  }, { capture: true });

  // Handle back/forward cache restore
  window.addEventListener("pageshow", () => {
    body.classList.remove("__fade-leave");
    body.classList.add("__fade-ready");
  });

  // Prefetch target pages on hover/touch
  const prefetched = new Set();
  function prefetch(url) {
    if (prefetched.has(url)) return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "document";
    link.href = url;
    document.head.appendChild(link);
    prefetched.add(url);
  }
  document.querySelectorAll("nav a[href]").forEach(a => {
    const url = a.href;
    a.addEventListener("mouseenter", () => prefetch(url));
    a.addEventListener("touchstart", () => prefetch(url), { passive: true });
  });

  // ===== Privacy modal wiring =====
  const modal    = document.getElementById("privacyModal");
  const openBtn  = document.getElementById("openPrivacy");
  const closeBtn = document.getElementById("closePrivacy");
  const closeCta = document.getElementById("closePrivacyCta");
  const backdrop = document.getElementById("privacyBackdrop");

  function openPolicy(e){ if(e) e.preventDefault(); modal?.setAttribute("aria-hidden","false"); }
  function closePolicy(){ modal?.setAttribute("aria-hidden","true"); }

  openBtn?.addEventListener("click", openPolicy);
  closeBtn?.addEventListener("click", closePolicy);
  closeCta?.addEventListener("click", closePolicy);
  backdrop?.addEventListener("click", closePolicy);
  document.addEventListener("keydown", (e)=>{
    if(e.key==="Escape" && modal?.getAttribute("aria-hidden")==="false") closePolicy();
  });

  // ===== Cookie consent banner =====
  const KEY        = "da_cookie_consent";
  const banner     = document.getElementById("cookieBanner");
  const btnAccept  = document.getElementById("cookieAccept");
  const btnDecline = document.getElementById("cookieDecline");
  const learnMore  = document.getElementById("cookieLearnMore");

  function setConsent(status){
    try { localStorage.setItem(KEY, status); } catch(_) {}
    if (typeof gtag === "function") {
      const granted = (status === "granted");
      gtag("consent", "update", {
        "analytics_storage": granted ? "granted" : "denied",
        "ad_storage": "denied",
        "ad_user_data": "denied",
        "ad_personalization": "denied"
      });
    }
  }
  function show(){ if (banner) banner.hidden = false; }
  function hide(){ if (banner) banner.hidden = true; }

  let existing = null;
  try { existing = localStorage.getItem(KEY); } catch(_) {}
  if (!existing) show();

  btnAccept?.addEventListener("click", ()=>{ setConsent("granted"); hide(); });
  btnDecline?.addEventListener("click", ()=>{ setConsent("denied"); hide(); });
  learnMore?.addEventListener("click", (e)=>{ e.preventDefault(); openPolicy(); });
};


