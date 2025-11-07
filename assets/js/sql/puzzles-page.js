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
    tables: document.getElementById('tablesUsed'),
    schema: document.getElementById('schemaBox')
  };

  // Guard if this is a static preview without ids
  if (!els.list) return;

  // Load puzzles.json
  const puzzlesResp = await fetch('/assets/sql/puzzles.json').catch(() => null);
  if (!puzzlesResp || !puzzlesResp.ok) {
    els.results.textContent = 'puzzles.json not found. Place it at /assets/sql/puzzles.json';
    return;
  }
  const puzzlesData = await puzzlesResp.json();
  ResultVerifier.setPrecision(puzzlesData.numeric_precision || 4);

  // Use first week & first puzzle as default
  const week = puzzlesData.weeks?.[0];
  const puzzleItems = week?.puzzles || [];
  // Render sidebar
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

  // Load schema metadata (optional, only retail shown if present)
  async function loadSchema(dataset) {
    const key = dataset.replace('.sqlite','');
    const schemaResp = await fetch(`/assets/sql/metadata/schema-${key}.json`).catch(() => null);
    if (schemaResp && schemaResp.ok) {
      const schema = await schemaResp.json();
      els.schema.textContent = schema.tables.map(t => {
        const cols = t.columns.map(c => c.name + (c.name === (t.primary_key||[])[0] ? ' PK' : '')).join(', ');
        return `${t.name}(${cols})`;
      }).join('\n');
    } else {
      // fallback text
      els.schema.textContent = 'Schema metadata not found. Tables will still work.';
    }
  }

  // Initialize SQL engine & load DB on demand
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

  // Render a puzzle
  async function loadPuzzle(p) {
    els.title.textContent = `${week.title}: ${p.title}`;
    els.meta.textContent = `Difficulty: ${p.difficulty[0].toUpperCase()+p.difficulty.slice(1)} · Dataset: ${p.dataset}`;
    els.goal.innerHTML = `<strong>Goal:</strong> ${p.goal}`;
    els.editor.value = p.starter_sql || '/* Write your query here */';
    els.tables.innerHTML = (p.tables||[]).map(t => `<li>${t}</li>`).join('');
    await loadSchema(p.dataset);

    // wire Run / Check / Reveal
    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return;
    toolbar.querySelectorAll('button').forEach(btn => { btn.disabled = false; btn.style.cursor = 'pointer'; });

    const [btnRun, btnCheck, btnReveal] = toolbar.querySelectorAll('button');

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
        // hash compare
        const userHash = await ResultVerifier.hashResult(res, p.expected.columns, p.expected.order_by);
        const assertions = ResultVerifier.evalAssertions(res, p.expected.assertions || []);
        const ok = (userHash === p.expected.resultset_hash) && assertions.ok;
        els.results.innerHTML = `<div>${ok ? '✅ Correct!' : '❌ Not correct yet.'}</div>
          <div class="meta">Your hash: <code>${userHash}</code></div>
          <div class="meta">Expected: <code>${p.expected.resultset_hash}</code></div>
          ${assertions.details?.length ? '<pre class="meta">'+JSON.stringify(assertions.details,null,2)+'</pre>' : ''}`;
      } catch (e) {
        els.results.textContent = 'Error: ' + e.message;
      }
    };

    btnReveal.onclick = async () => {
      const path = p.solution_sql_path;
      const resp = await fetch(path).catch(() => null);
      if (!resp || !resp.ok) {
        els.results.textContent = 'No solution file found at ' + path;
        return;
      }
      const sql = await resp.text();
      els.editor.value = sql;
      els.results.textContent = 'Canonical solution loaded into editor.';
    };
  }

  function renderResults(res) {
    const cols = res.columns;
    const rows = res.rows;
    if (!rows.length) { els.results.textContent = '(no rows)'; return; }
    const thead = `<thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${String(r[c]??'')}</td>`).join('')}</tr>`).join('')}</tbody>`;
    els.results.innerHTML = `<div style="max-height:320px;overflow:auto;border:1px solid rgba(0,0,0,.06)"><table>${thead+tbody}</table></div>`;
  }

  // auto-load first puzzle
  if (puzzleItems[0]) loadPuzzle(puzzleItems[0]);

  // --- Keyboard shortcuts ---
  // Ctrl/Cmd + Enter = Run
  // Shift + Enter    = Check
  // Alt  + →         = Next puzzle in the list
  (function addPuzzleShortcuts() {
    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return;
    const [btnRun, btnCheck] = toolbar.querySelectorAll('button');

    function selectNextPuzzle() {
      const list = document.getElementById('puzzleList');
      if (!list) return;
      const items = Array.from(list.querySelectorAll('li[role="option"]'));
      if (!items.length) return;
      const idx = items.findIndex(li => li.getAttribute('aria-current') === 'true');
      const next = (idx >= 0 && idx < items.length - 1) ? items[idx + 1] : items[0];
      items.forEach(li => li.removeAttribute('aria-current'));
      next.setAttribute('aria-current', 'true');
      next.click();
      const meta = document.getElementById('puzzleMeta');
      if (meta) meta.insertAdjacentHTML('beforeend', ' • (Alt+→)');
    }

    document.addEventListener('keydown', (e) => {
      const mac = e.metaKey, ctrl = e.ctrlKey;
      // Run
      if ((mac || ctrl) && e.key === 'Enter') {
        e.preventDefault();
        btnRun?.click();
        return;
      }
      // Check
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        btnCheck?.click();
        return;
      }
      // Next puzzle
      if (e.altKey && (e.key === 'ArrowRight')) {
        e.preventDefault();
        selectNextPuzzle();
        return;
      }
    });
  })();
})();

