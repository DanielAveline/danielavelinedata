(function(){
  const modal = document.getElementById('contactModal');
  const openBtn = document.getElementById('openContactModal');
  const closeBtn = document.getElementById('closeContactModal');
  const backdrop = document.getElementById('modalBackdrop');
  const form = document.getElementById('contactForm');
  const success = document.getElementById('contactSuccess');
  const closeAfterSuccess = document.getElementById('closeAfterSuccess');

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    setTimeout(()=>{
      const first = form?.querySelector('input,textarea,button');
      first && first.focus();
    }, 10);
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    success.hidden = true;
    form.hidden = false;
    form.reset();
  }

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && modal.getAttribute('aria-hidden')==='false') closeModal();
  });

  // Optional success panel hook (if you use AJAX submission)
  // form?.addEventListener('submit', async (e)=>{
  //   e.preventDefault();
  //   const data = new FormData(form);
  //   await fetch(form.action, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } });
  //   form.hidden = true; success.hidden = false;
  // });

  closeAfterSuccess?.addEventListener('click', closeModal);
})();