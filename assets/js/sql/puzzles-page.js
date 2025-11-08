import { SQLEngine } from '/assets/js/sql/engine.js';
import { ResultVerifier } from '/assets/js/sql/verify.js';

(async function () {
  const els = {
    list: document.getElementById('puzzleList'),
    title: document.getElementById('puzzleTitle'),
    meta: document.getElementById('puzzleMeta'),
    goal: document.getElementById('puzzleGoal'),
    editor: document.getElementById('sqlEditor'),
    results: document.getElementById('sqlResults'),
    schema: document.getElementById('schemaBox')
  };

  if (!els.list) return;

  // Load puzzles.json
  const puzzlesResp = await fetch('/assets/sql/puzzles.json').catch(() => null);
  if (!puzzlesResp || !puzzlesResp.ok) {
    els.results.textContent = 'puzzles.json not found. Place it at /assets/sql/puzzles.json';
    return;
  }
  const puzzlesData = await puzzlesResp.json();
  ResultVerifier.setPrecision(puzzlesData.numeric_precision || 4);

  const week = puzzlesData.weeks?.[0];
  const puzzleItems = week?.puzzles || [];

  // Render the puzzles list
  els.list.innerHTML = '';
  for (const p of puzzleItems) {
    const li = document.createElement('li');
    li.role = 'option';
    li.textContent = `${week.title} (${p.difficulty[0].toUpperCase() + p.difficulty.slice(1)})`;
    li.dataset.slug = p.slug;
    li.addEventListener('click', () => {
      els.list.querySelectorAll('li[aria-current="true"]').forEach(x => x.removeAttribute('aria-current'));
      li.setAttribute('aria-current', 'true');
      loadPuzzle(p);
    });
    els.list.appendChild(li);
  }
  if (els.list.firstElementChild) els.list.firstElementChild.setAttribute('aria-current', 'true');

  // Schema loader: show dataset name and each table on its own line
  async function loadSchema(dataset) {
    const key = dataset.replace('.sqlite','');
    const schemaResp = await fetch(`/assets/sql/metadata/schema-${key}.json`).catch(() => null);
    if (schemaResp && schemaResp.ok) {
      const schema = await schemaResp.json();
      const header = `Database: ${dataset}`;
      const lines = schema.tables.map(t => {
        const cols = t.columns.map(c => c.name + (t.primary_key?.includes(c.name) ? ' PK' : '')).join(', ');
        return `${t.name}(${cols})`;
      });
      els.schema.textContent = [header, ...lines].join('\n');
    } else {
      els.schema.textContent = `Database: ${dataset}\n(no schema metadata found)`;
    }
  }

  // SQL engine
  let engine = null;
  async function ensureEngineAndDB(dataset) {
    if (!engine) {
      try {
        engine = await SQLEngine.create('/assets/sql/sql-wasm.wasm', '/assets/sql/sql-wasm.js');
      } catch (e) {
        els.results.textContent = e.message;
        throw e;
      }
    }
    await engine.loadDB(`/assets/sql/datasets/${dataset}`);
  }

  async function loadPuzzle(p) {
    els.title.textContent = `${week.title}: ${p.title}`;
    els.meta.textContent = `Difficulty: ${p.difficulty} · Dataset: ${p.dataset}`;
    els.goal.innerHTML = `<strong>Goal:</strong> ${p.goal}`;
    els.editor.value = p.starter_sql || '/* Write your query here */';

    await loadSchema(p.dataset);

    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return;
    toolbar.querySelectorAll('button').forEach(b => { b.disabled = false; b.style.cursor = 'pointer'; });

    const [btnRun, btnCheck] = toolbar.querySelectorAll('button');

    btnRun.onclick = async () => {
      try {
        els.results.textContent = 'Running...';
        await ensureEngineAndDB(p.dataset);
        const res = engine.run(els.editor.value);
        renderResults(res);
      } catch (e) {
        els.results.textContent = 'Error: ' + e.message;
      }
    };

    btnCheck.onclick = async () => {
      try {
        els.results.textContent = 'Checking...';
        await ensureEngineAndDB(p.dataset);
        const res = engine.run(els.editor.value);
        const userHash = await ResultVerifier.hashResult(res, p.expected?.columns, p.expected?.order_by);
        const assertions = ResultVerifier.evalAssertions(res, p.expected?.assertions || []);
        const ok = (userHash === p.expected?.resultset_hash) && assertions.ok;
        els.results.innerHTML = `<div>${ok ? '✅ Correct!' : '❌ Not correct yet.'}</div>
          ${userHash ? `<div class="meta">Your hash: <code>${userHash}</code></div>` : ''}
          ${p.expected?.resultset_hash ? `<div class="meta">Expected: <code>${p.expected.resultset_hash}</code></div>` : ''}`;
      } catch (e) {
        els.results.textContent = 'Error: ' + e.message;
      }
    };
  }

  function renderResults(res) {
    const cols = res.columns;
    const rows = res.rows;
    if (!rows.length) { els.results.textContent = '(no rows)'; return; }
    const thead = `<thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${String(r[c]??'')}</td>`).join('')}</tr>`).join('')}</tbody>`;
    els.results.innerHTML = `<div style="max-height:340px;overflow:auto;border:1px solid rgba(17,17,17,.06)"><table>${thead+tbody}</table></div>`;
  }

  if (puzzleItems[0]) loadPuzzle(puzzleItems[0]);
})();

