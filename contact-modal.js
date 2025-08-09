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
