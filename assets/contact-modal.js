// contact-modal.js — Modal logic + Google Analytics events
(function(){
  function gaEvent(name, params){
    if (typeof gtag === 'function') gtag('event', name, params || {});
  }

  const modal = document.getElementById('contactModal');
  const openBtn = document.getElementById('openContactModal');
  const closeBtn = document.getElementById('closeContactModal');
  const backdrop = document.getElementById('modalBackdrop');
  const form = document.getElementById('contactForm');
  const success = document.getElementById('contactSuccess');
  const closeAfterSuccess = document.getElementById('closeAfterSuccess');

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    gaEvent('contact_modal_opened', { location: 'contact_card' });
    setTimeout(()=>{ const first = form?.querySelector('input,textarea,button'); first && first.focus(); }, 10);
  }
  function closeModal(reason){
    modal.setAttribute('aria-hidden','true');
    if (reason) gaEvent('contact_modal_closed', { reason: reason });
    success.hidden = true;
    form.hidden = false;
    form.reset();
  }

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', ()=>closeModal('close_button'));
  backdrop?.addEventListener('click', ()=>closeModal('backdrop'));
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && modal.getAttribute('aria-hidden')==='false') closeModal('escape'); });

  const linkLinkedIn = document.querySelector('.da-actions a[href^="https://www.linkedin.com"]');
  const linkEmail    = document.querySelector('.da-actions a[href^="mailto:"]');
  linkLinkedIn?.addEventListener('click', ()=>gaEvent('contact_link_click', { channel: 'linkedin' }));
  linkEmail?.addEventListener('click', ()=>gaEvent('contact_link_click', { channel: 'email' }));

  form?.addEventListener('submit', function(){
    gaEvent('contact_form_submitted', { method: 'formspree' });
  });

  closeAfterSuccess?.addEventListener('click', ()=>closeModal('success_close'));
})();



// ===== Accessible modal focus trap (added) =====
(() => {
  const modal = document.getElementById('contactModal');
  if (!modal) return;
  const closeBtn = document.getElementById('modalClose');
  const openBtn = document.querySelector('[data-open-contact]') || document.getElementById('openContact');
  const backdrop = document.getElementById('modalBackdrop');
  let previouslyFocused = null;

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function getFocusable() {
    return Array.from(modal.querySelectorAll(focusableSelector))
      .filter(el => (el.offsetParent !== null) || el === closeBtn);
  }

  function openModal() {
    previouslyFocused = document.activeElement;
    modal.removeAttribute('aria-hidden');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    modal.focus();

    const focusables = getFocusable();
    (focusables[0] || closeBtn || modal).focus();

    document.addEventListener('keydown', onKeydown);
  }

  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);
    if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = getFocusable();
      if (!focusables.length) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  }

  openBtn && openBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  closeBtn && closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
  backdrop && backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

  // Expose for manual control
  window.openContactModal = openModal;
  window.closeContactModal = closeModal;
})();
