import { SQLEngine } from '/assets/js/sql/engine.js';
import { ResultVerifier } from '/assets/js/sql/verify.js';

(async function () {
  const els = {
    title: document.getElementById('lessonTitle'),
    idx: document.getElementById('stepIndex'),
    total: document.getElementById('stepTotal'),
    editor: document.getElementById('labEditor'),
    results: document.getElementById('labResults'),
    progress: document.getElementById('progress'),
    schema: document.getElementById('schemaBox')
  };
  if (!els.title) return;

  const lessonsResp = await fetch('/assets/sql/lessons.json').catch(() => null);
  if (!lessonsResp || !lessonsResp.ok) {
    els.results.textContent = 'lessons.json not found at /assets/sql/lessons.json';
    return;
  }
  const lessons = await lessonsResp.json();
  const lesson = lessons.lessons?.[0];
  if (!lesson) return;

  ResultVerifier.setPrecision(4);

  els.total.textContent = lesson.steps.length;
  let stepIndex = 0;

  async function loadSchema(dataset) {
    const key = dataset.replace('.sqlite','');
    const schemaResp = await fetch(`/assets/sql/metadata/schema-${key}.json`).catch(() => null);
    if (schemaResp && schemaResp.ok) {
      const schema = await schemaResp.json();
      els.schema.textContent = schema.tables.map(t => `${t.name}(${t.columns.map(c=>c.name).join(', ')})`).join('\n');
    } else {
      els.schema.textContent = 'Schema metadata not found.';
    }
  }

  let engine = null;
  async function ensureEngine(dataset) {
    if (!engine) {
      engine = await SQLEngine.create('/assets/sql/sql-wasm.wasm', '/assets/sql/sql-wasm.js');
    }
    await engine.loadDB(`/assets/sql/datasets/${dataset}`);
  }

  function renderStep() {
    const s = lesson.steps[stepIndex];
    els.idx.textContent = stepIndex + 1;
    els.title.textContent = `Lesson: ${lesson.title} (Step ${stepIndex+1} of ${lesson.steps.length})`;
    els.editor.value = s.starter_sql || '';
    els.results.textContent = 'Ready.';
  }

  async function runSQL() {
    try {
      els.results.textContent = 'Running...';
      await ensureEngine(lesson.dataset);
      const res = engine.run(els.editor.value);
      renderResults(res);
    } catch (e) {
      els.results.textContent = 'Error: ' + e.message;
    }
  }

  async function checkStep() {
    const s = lesson.steps[stepIndex];
    try {
      els.results.textContent = 'Checking...';
      await ensureEngine(lesson.dataset);
      const res = engine.run(els.editor.value);
      let ok = false;
      if (s.verify.type === 'rowcount') {
        ok = (res.rows.length === Number(s.verify.value));
      } else if (s.verify.type === 'resultset_hash') {
        const hash = await ResultVerifier.hashResult(res, null, s.verify.order_by);
        ok = (hash === s.verify.value);
      }
      els.results.textContent = ok ? '✅ Correct!' : '❌ Not yet.';
    } catch (e) {
      els.results.textContent = 'Error: ' + e.message;
    }
  }

  function nextStep() {
    if (stepIndex < lesson.steps.length - 1) {
      stepIndex += 1;
      renderStep();
    } else {
      els.results.textContent = '🎉 Lesson complete!';
    }
  }

  function renderResults(res) {
    const cols = res.columns;
    const rows = res.rows;
    if (!rows.length) { els.results.textContent = '(no rows)'; return; }
    const thead = `<thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${String(r[c]??'')}</td>`).join('')}</tr>`).join('')}</tbody>`;
    els.results.innerHTML = `<div style="max-height:320px;overflow:auto;"><table>${thead+tbody}</table></div>`;
  }

  const toolbar = document.querySelector('.toolbar');
  if (toolbar) {
    const [btnRun, btnCheck, btnNext] = toolbar.querySelectorAll('button');
    [btnRun, btnCheck, btnNext].forEach(b => { b.disabled = false; b.style.cursor = 'pointer'; });
    btnRun.onclick = runSQL;
    btnCheck.onclick = checkStep;
    btnNext.onclick = nextStep;
  }

  await loadSchema(lesson.dataset);
  renderStep();
})();

