(async function () {
  const list = document.getElementById('newsList');
  if (!list) return;

  try {
    const res = await fetch('/assets/data/news.json', { cache: 'no-store' });
    if (!res.ok) return;

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    if (!items.length) return;

    list.innerHTML = items.map(i => `
      <li style="padding:10px 12px;border:1px solid rgba(15,23,42,.10);border-radius:12px;background:#fff;">
        <div style="font-weight:800;color:#0f172a;">${i.title || ''}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">${i.date || ''}</div>
        <div style="margin-top:6px;color:#0f172a;">${i.body || ''}</div>
      </li>
    `).join('');
  } catch {
    // do nothing (keep "Coming soon" placeholder)
  }
})();
