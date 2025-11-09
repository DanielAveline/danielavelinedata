import { SQLEngine } from '/assets/js/sql/engine.js';
import { ResultVerifier } from '/assets/js/sql/verify.js';

(async function () {
  const els = {
    tree: document.getElementById('monthTree'),
    title: document.getElementById('puzzleTitle'),
    goal: document.getElementById('puzzleGoal'),
    sqlLabel: document.getElementById('sqlLabel'),
    editorTA: document.getElementById('sqlEditor'),
    results: document.getElementById('sqlResults'),
    schema: document.getElementById('schemaBox'),
    btnClear: document.getElementById('btnClearResults')
  };
  if (!els.tree) return;

  // CodeMirror
  let editorCM = window.CodeMirror.fromTextArea(els.editorTA, {
    mode: 'text/x-sql',
    theme: 'eclipse',
    lineNumbers: true,
    styleActiveLine: true,
    matchBrackets: true,
    indentWithTabs: true,
    smartIndent: true,
    tabSize: 2,
    indentUnit: 2,
    lineWrapping: true,
    gutters: ['CodeMirror-linenumbers', 'err-gutter']
  });

  function clearEditorErrors() {
    const last = editorCM.getDoc().lineCount();
    for (let i = 0; i < last; i++) {
      editorCM.removeLineClass(i, 'background', 'cm-error-line');
      editorCM.setGutterMarker(i, 'err-gutter', null);
    }
    if (window.__errMarks) window.__errMarks.forEach(m => m.clear());
    window.__errMarks = [];
  }
  function markError(fromPos, toPos) {
    const mark = editorCM.getDoc().markText(fromPos, toPos, { className: 'cm-error-range' });
    (window.__errMarks ||= []).push(mark);
    editorCM.addLineClass(fromPos.line, 'background', 'cm-error-line');
    const dot = document.createElement('div');
    dot.className = 'cm-error-marker';
    editorCM.setGutterMarker(fromPos.line, 'err-gutter', dot);
    editorCM.scrollIntoView({ from: fromPos, to: toPos }, 100);
  }

  function splitSqlStatements(doc) {
    const text = doc.getValue();
    const parts = [];
    let start = 0, inS = false, inD = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i], prev = text[i - 1];
      if (ch === "'" && !inD && prev !== '\\') inS = !inS;
      else if (ch === '"' && !inS && prev !== '\\') inD = !inD;

      if (ch === ';' && !inS && !inD) {
        const raw = text.slice(start, i);
        const trimmed = raw.trim();
        if (trimmed) {
          const leadingWS = raw.match(/^\s*/)[0].length;
          const from = editorCM.posFromIndex(start + leadingWS);
          const to = editorCM.posFromIndex(i);
          parts.push({ sql: trimmed, from, to });
        }
        start = i + 1;
      }
    }
    const rawTail = text.slice(start);
    const trimmedTail = rawTail.trim();
    if (trimmedTail) {
      const leadingWS = rawTail.match(/^\s*/)[0].length;
      const from = editorCM.posFromIndex(start + leadingWS);
      const to = editorCM.posFromIndex(text.length);
      parts.push({ sql: trimmedTail, from, to });
    }
    return parts;
  }

  function runSqlSafely(engine) {
    const stmts = splitSqlStatements(editorCM.getDoc());
    let lastRes = null;
    for (const s of stmts) {
      try { lastRes = engine.run(s.sql); }
      catch (e) { return { ok:false, err:e, pos:s }; }
    }
    return { ok:true, res:lastRes || { columns:[], rows:[] } };
  }

  const puzzlesResp = await fetch('/assets/sql/puzzles.json').catch(() => null);
  if (!puzzlesResp || !puzzlesResp.ok) {
    els.results.textContent = 'puzzles.json not found. Place it at /assets/sql/puzzles.json';
    return;
  }
  const puzzlesData = await puzzlesResp.json();
  ResultVerifier.setPrecision(puzzlesData.numeric_precision || 4);

  const weeks = Array.isArray(puzzlesData.weeks) ? puzzlesData.weeks : [];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const currentMonthIndex = new Date().getMonth();

  const monthHtml = months.map((name, idx) => {
    const isDecember = idx === 11;
    const isCurrent = idx === currentMonthIndex;
    const weeksHtml = isDecember
      ? `<ul class="weeks" role="group">
          ${weeks.map(w => `<li role="treeitem" tabindex="0" data-week-slug="${w.slug || 'week-01-retail'}">${w.title || 'Week 01 — Retail'}</li>`).join('')}
         </ul>`
      : `<div class="meta" style="padding:.5rem .65rem;">(coming soon)</div>`;
    const open = isDecember ? ' open' : '';
    const cls  = isCurrent ? ' class="current-month"' : '';
    return `<details${open}${cls}><summary>${name}</summary>${weeksHtml}</details>`;
  }).join('');
  els.tree.innerHTML = monthHtml;

  const weekItems = els.tree.querySelectorAll('.weeks li[role="treeitem"]');
  weekItems.forEach((li, i) => {
    li.addEventListener('click', () => {
      weekItems.forEach(x => x.removeAttribute('aria-current'));
      li.setAttribute('aria-current', 'true');
      loadWeekByIndex(i);
    });
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); }
    });
  });
  if (weekItems[0]) weekItems[0].setAttribute('aria-current', 'true');

  async function loadSchema(dataset) {
    const displayName = dataset.replace(/\.sqlite$/i, '');
    const resp = await fetch(`/assets/sql/metadata/schema-${displayName}.json`).catch(() => null);

    const renderTable = (t) => {
      const cols = (t.columns || []).map(c => {
        const isPk = Array.isArray(t.primary_key) && t.primary_key.includes(c.name);
        const type = c.type ? ` ${c.type}` : '';
        return `<span class="col-line">${c.name}${type}${isPk ? ' <span class="pk">PK</span>' : ''}</span>`;
      }).join('');
      return `<details class="tbl"><summary>${t.name}</summary><div class="tbl-body">${cols || '<span class="col-line">(no columns listed)</span>'}</div></details>`;
    };

    if (resp && resp.ok) {
      const schema = await resp.json();
      els.schema.innerHTML = `<div class="schema-accordion">
        <div class="schema-dataset">Database: ${displayName}</div>
        ${schema.tables.map(renderTable).join('')}
      </div>`;
    } else {
      els.schema.innerHTML = `<div class="schema-accordion">
        <div class="schema-dataset">Database: ${displayName}</div>
        <p class="meta" style="margin:.25rem 0 0;">(schema metadata not found)</p>
      </div>`;
    }
  }

  let engine = null;
  async function ensureEngineAndDB(dataset) {
    if (!engine) {
      engine = await SQLEngine.create('/assets/sql/sql-wasm.wasm', '/assets/sql/sql-wasm.js');
    }
    await engine.loadDB(`/assets/sql/datasets/${dataset}`);
  }

  function renderResults(res) {
    const cols = res.columns || [];
    const rows = res.rows || [];
    const rowCount = rows.length;

    if (!rowCount) {
      els.results.innerHTML = `
        <div class="result-meta"><span>${rowCount} rows</span><span>${cols.length} ${cols.length === 1 ? 'column' : 'columns'}</span></div>
        <div style="height:200px;display:flex;align-items:center;justify-content:center;color:#64748b;">(no rows)</div>`;
      return;
    }

    const thead = `<thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${String(r[c] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>`;
    els.results.innerHTML = `
      <div class="result-meta"><span>${rowCount} ${rowCount===1?'row':'rows'}</span><span>${cols.length} ${cols.length===1?'column':'columns'}</span></div>
      <div style="height:420px;overflow:auto;border:1px solid rgba(17,17,17,.06);border-radius:10px;"><table>${thead+tbody}</table></div>`;
  }

  async function loadWeekByIndex(weekIdx) {
    const w = weeks[weekIdx] || weeks[0];
    if (!w) return;

    els.title.textContent = `${w.title || 'Week 01 — Retail'}`;

    const dataset = (w.puzzles?.[0]?.dataset || 'retail.sqlite');
    const datasetDisplay = dataset.replace(/\.sqlite$/i, '');
    const difficulty = (w.puzzles?.[0]?.difficulty || 'easy');
    const goalText = (w.puzzles?.[0]?.goal) || 'Open the week and run queries.';

    els.goal.innerHTML = `<strong>Goal:</strong> ${goalText}<br/>
      <span class="meta" style="color:#334155;display:inline-block;margin-top:.4rem;">
        <strong>Difficulty:</strong> ${difficulty} &nbsp;•&nbsp; <strong>Dataset:</strong> ${datasetDisplay}
      </span>`;

    await loadSchema(dataset);

    els.sqlLabel.textContent = `Your SQL — dataset: ${datasetDisplay}`;
    editorCM.setValue((w.puzzles?.[0]?.starter_sql) || '/* Write your query here */');
    editorCM.refresh();

    const toolbar = document.querySelector('.toolbar');
    toolbar.querySelectorAll('button').forEach(b => { b.disabled = false; b.style.cursor='pointer'; });

    const [btnRun, btnCheck] = toolbar.querySelectorAll('button');

    btnRun.onclick = async () => {
      try {
        clearEditorErrors();
        els.results.textContent = 'Running...';
        await ensureEngineAndDB(dataset);
        const out = runSqlSafely(engine);
        if (!out.ok) {
          const line = out.pos.from.line + 1;
          markError(out.pos.from, out.pos.to);
          els.results.innerHTML = `<div style="color:#b91c1c;">Error near line ${line}: ${out.err.message || out.err}</div>`;
          return;
        }
        renderResults(out.res);
      } catch (e) {
        els.results.innerHTML = `<div style="color:#b91c1c;">Error: ${e.message || e}</div>`;
      }
    };

    btnCheck.onclick = async () => {
      try {
        clearEditorErrors();
        els.results.textContent = 'Checking...';
        await ensureEngineAndDB(dataset);
        const out = runSqlSafely(engine);
        if (!out.ok) {
          const line = out.pos.from.line + 1;
          markError(out.pos.from, out.pos.to);
          els.results.innerHTML = `<div style="color:#b91c1c;">Error near line ${line}: ${out.err.message || out.err}</div>`;
          return;
        }

        const p = w.puzzles?.[0] || {};
        const userHash = await ResultVerifier.hashResult(out.res, p.expected?.columns, p.expected?.order_by);
        const assertions = ResultVerifier.evalAssertions(out.res, p.expected?.assertions || []);
        const ok = (userHash === p.expected?.resultset_hash) && assertions.ok;

        els.results.innerHTML = `<div>${ok ? '✅ Correct!' : '❌ Not correct yet.'}</div>
          ${userHash ? `<div class="meta">Your hash: <code>${userHash}</code></div>` : ''}
          ${p.expected?.resultset_hash ? `<div class="meta">Expected: <code>${p.expected.resultset_hash}</code></div>` : ''}`;
      } catch (e) {
        els.results.innerHTML = `<div style="color:#b91c1c;">Error: ${e.message || e}</div>`;
      }
    };
  }

  if (els.btnClear) {
    els.btnClear.addEventListener('click', () => { els.results.innerHTML = ''; els.btnClear.blur(); });
  }

  loadWeekByIndex(0);
})();







