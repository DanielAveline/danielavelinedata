<script>
// Everything global (nav highlight, privacy modal, cookie consent)
window.siteInit = function () {
  // --- Highlight active nav link
  const path = location.pathname.replace(/\/+$/, '');
  document.querySelectorAll('nav a[data-nav]').forEach(a => {
    const href = a.getAttribute('href').replace(/\/+$/, '');
    if (href === path || (path === '' && href === '/index.html')) {
      a.setAttribute('aria-current', 'page');
    }
  });

  // --- Privacy modal open/close
  const modal    = document.getElementById('privacyModal');
  const openBtn  = document.getElementById('openPrivacy');
  const closeBtn = document.getElementById('closePrivacy');
  const closeCta = document.getElementById('closePrivacyCta');
  const backdrop = document.getElementById('privacyBackdrop');

  function openPolicy(e){ if(e) e.preventDefault(); modal?.setAttribute('aria-hidden','false'); }
  function closePolicy(){ modal?.setAttribute('aria-hidden','true'); }

  openBtn?.addEventListener('click', openPolicy);
  closeBtn?.addEventListener('click', closePolicy);
  closeCta?.addEventListener('click', closePolicy);
  backdrop?.addEventListener('click', closePolicy);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && modal?.getAttribute('aria-hidden')==='false') closePolicy(); });

  // --- Cookie consent
  const KEY = 'da_cookie_consent';
  const banner     = document.getElementById('cookieBanner');
  const btnAccept  = document.getElementById('cookieAccept');
  const btnDecline = document.getElementById('cookieDecline');
  const learnMore  = document.getElementById('cookieLearnMore');

  function setConsent(status){
    try { localStorage.setItem(KEY, status); } catch(_) {}
    if (typeof gtag === 'function') {
      const granted = (status === 'granted');
      gtag('consent', 'update', {
        'analytics_storage': granted ? 'granted' : 'denied',
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied'
      });
    }
  }
  function show(){ if (banner) banner.hidden = false; }
  function hide(){ if (banner) banner.hidden = true; }

  let existing = null;
  try { existing = localStorage.getItem(KEY); } catch(_) {}
  if (!existing) show();

  btnAccept?.addEventListener('click', ()=>{ setConsent('granted'); hide(); });
  btnDecline?.addEventListener('click', ()=>{ setConsent('denied'); hide(); });
  learnMore?.addEventListener('click', (e)=>{ e.preventDefault(); openPolicy(); });
};
</script>
