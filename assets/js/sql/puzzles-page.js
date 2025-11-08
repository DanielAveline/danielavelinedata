import { SQLEngine } from '/assets/js/sql/engine.js';
import { ResultVerifier } from '/assets/js/sql/verify.js';

(async function () {
  const els = {
    tree: document.getElementById('monthTree'),
    title: document.getElementById('puzzleTitle'),
    meta: document.getElementById('puzzleMeta'),
    goal: document.getElementById('puzzleGoal'),
    editor: document.getElementById('sqlEditor'),
    results: document.getElementById('sqlResults'),
    schema: document.getElementById('schemaBox')
  };
  if (!els.tree) return;

  // Load puzzles.json
  const puzzlesResp = await fetch('/assets/sql/puzzles.json').catch(() => null);
  if (!puzzlesResp || !puzzlesResp.ok) {
    els.results.textContent = 'puzzles.json not found. Place it at /assets/sql/puzzles.json';
    return;
  }
  const puzzlesData = await puzzlesResp.json();
  ResultVerifier.setPrecision(puzzlesData.numeric_precision || 4);

  // We’ll place all current weeks into December by default (future weeks can carry a month field)
  const weeks = Array.isArray(puzzlesData.weeks) ? puzzlesData.weeks : [];
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  // Render the Month → Week tree
  const monthHtml = months.map((name, idx) => {
    const isDecember = idx === 11;
    const disabledNote = !isDecember ? '<div class="meta" style="padding:.5rem .65rem;">(coming soon)</div>' : '';

    // December gets the actual weeks list
    const weeksHtml = isDecember
      ? `
        <ul class="weeks" role="group">
          ${weeks.map(w => `
            <li role="treeitem" tabindex="0" data-week-slug="${w.slug || 'week-01-retail'}">
              ${w.title || 'Week 01 — Retail'}
            </li>`).join('')}
        </ul>
      `
      : disabledNote;

    // Keep December expanded by default
    const open = isDecember ? ' open' : '';

    return `
      <details${open}>
        <summary>${name}</summary>
        ${weeksHtml}
      </details>
    `;
  }).join('');

  els.tree.innerHTML = monthHtml;

  // Event handling for week clicks
  const weekItems = els.tree.querySelectorAll('.weeks li[role="treeitem"]');
  weekItems.forEach((li, i) => {
    li.addEventListener('click', () => {
      weekItems.forEach(x => x.removeAttribute('aria-current'));
      li.setAttribute('aria-current', 'true');
      loadWeekByIndex(i);
    });
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); }});
  });

  // Default: select first week in December if available
  if (weekItems[0]) {
    weekItems[0].setAttribute('aria-current', 'true');
  }

  // ---------- Schema loader: dataset name (without .sqlite) + accordion ----------
  async function loadSchema(dataset) {
    const displayName = dataset.replace(/\.sqlite$/i, '');
    const schemaResp = await fetch(`/assets/sql/metadata/schema-${displayName}.json`).catch(() => null);

    const renderTable = (t) => {
      const cols = (t.columns || []).map(c => {
        const isPk = Array.isArray(t.primary_key) && t.primary_key.includes(c.name);
        const type = c.type ? ` ${c.type}` : '';
        return `<span class="col-line">${c.name}${type}${isPk ? ' <span class="pk">PK</span>' : ''}</span>`;
      }).join('');
      return `
        <details class="tbl">
          <summary>${t.name}</summary>
          <div class="tbl-body">
            ${cols || '<span class="col-line">(no columns listed)</span>'}
          </div>
        </details>
      `;
    };

    if (schemaResp && schemaResp.ok) {
      const schema = await schemaResp.json();
      els.schema.innerHTML = `
        <div class="schema-accordion">
          <div class="schema-dataset">Database: ${displayName}</div>
          ${schema.tables.map(renderTable).join('')}
        </div>
      `;
    } else {
      els.schema.innerHTML = `
        <div class="schema-accordion">
          <div class="schema-dataset">Database: ${displayName}</div>
          <p class="meta" style="margin:.25rem 0 0;">(schema metadata not found)</p>
        </div>
      `;
    }
  }

  // ---------- SQL engine ----------
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

  function renderResults(res) {
    const cols = res.columns;
    const rows = res.rows;
    if (!rows.length) { els.results.textContent = '(no rows)'; return; }
    const thead = `<thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${String(r[c]??'')}</td>`).join('')}</tr>`).join('')}</tbody>`;
    els.results.innerHTML = `
      <div style="height: 480px; overflow:auto; border:1px solid rgba(17,17,17,.06); border-radius:10px;">
        <table>${thead+tbody}</table>
      </div>`;
  }

  async function loadWeekByIndex(weekIdx) {
    const w = weeks[weekIdx] || weeks[0];
    if (!w) return;

    els.title.textContent = `${w.title || 'Week 01 — Retail'}`;
    els.meta.textContent = `Difficulty: ${(w.puzzles?.[0]?.difficulty || 'easy')} · Dataset: ${w.puzzles?.[0]?.dataset || 'retail.sqlite'}`;
    els.goal.innerHTML = `<strong>Goal:</strong> ${w.puzzles?.[0]?.goal || 'Open the week and run queries.'}`;
    els.editor.value = (w.puzzles?.[0]?.starter_sql) || '/* Write your query here */';

    // Derive dataset from first puzzle in the week
    const dataset = w.puzzles?.[0]?.dataset || 'retail.sqlite';
    await loadSchema(dataset);

    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return;
    toolbar.querySelectorAll('button').forEach(b => { b.disabled = false; b.style.cursor = 'pointer'; });

    const [btnRun, btnCheck] = toolbar.querySelectorAll('button');

    btnRun.onclick = async () => {
      try {
        els.results.textContent = 'Running...';
        await ensureEngineAndDB(dataset);
        const res = engine.run(els.editor.value);
        renderResults(res);
      } catch (e) {
        els.results.textContent = 'Error: ' + e.message;
      }
    };

    btnCheck.onclick = async () => {
      try {
        els.results.textContent = 'Checking...';
        await ensureEngineAndDB(dataset);
        const res = engine.run(els.editor.value);

        // If your weeks include expected output per puzzle, we use the first puzzle's expected
        const p = w.puzzles?.[0] || {};
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

  // Load default (first week under December)
  loadWeekByIndex(0);
})();



