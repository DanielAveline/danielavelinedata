// assets/js/sql/engine.js
// Robust loader for sql.js in the browser (no bundler)
// - Dynamically injects <script src="/assets/sql/sql-wasm.js">
// - Uses window.initSqlJs to initialize with the .wasm file
// - Caches a singleton instance so navigation is fast

async function loadSqlJs(jsUrl) {
  // If already present and valid, reuse it
  if (typeof window.initSqlJs === 'function') return window.initSqlJs;

  // If a script tag is already there but still initializing, wait for it
  const existing = [...document.scripts].find(s => s.src.endsWith(jsUrl));
  if (existing && existing.dataset.__loading !== 'done') {
    await new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load sql.js')), { once: true });
    });
    if (typeof window.initSqlJs === 'function') return window.initSqlJs;
  }

  // Inject a script tag for sql-wasm.js (UMD build exposes window.initSqlJs)
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = jsUrl;
    s.async = true;
    s.dataset.__loading = 'pending';
    s.onload = () => { s.dataset.__loading = 'done'; resolve(); };
    s.onerror = () => reject(new Error(`Failed to load ${jsUrl}`));
    document.head.appendChild(s);
  });

  if (typeof window.initSqlJs !== 'function') {
    throw new Error('sql-wasm.js loaded but window.initSqlJs was not found');
  }
  return window.initSqlJs;
}

export class SQLEngine {
  constructor(SQL) {
    this.SQL = SQL;
    this.db = null;
  }

  static async create(
    wasmUrl = '/assets/sql/sql-wasm.wasm',
    jsUrl   = '/assets/sql/sql-wasm.js'
  ) {
    // Reuse a singleton to avoid re-compiling WASM across navigations
    if (window.__SQLJS_SINGLETON) return window.__SQLJS_SINGLETON;

    const initSqlJs = await loadSqlJs(jsUrl);
    const SQL = await initSqlJs({
      locateFile: () => wasmUrl
    });

    const inst = new SQLEngine(SQL);
    window.__SQLJS_SINGLETON = inst;
    return inst;
  }

  async loadDB(dbUrl) {
    const res = await fetch(dbUrl);
    if (!res.ok) throw new Error(`Failed to fetch database: ${dbUrl}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    // Close any previous DB to free memory
    if (this.db) try { this.db.close(); } catch {}
    this.db = new this.SQL.Database(buf);
  }

  run(sql) {
    if (!this.db) throw new Error('Database not loaded');
    const stmt = this.db.prepare(sql);
    const columns = stmt.getColumnNames();
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return { columns, rows };
  }

  close() {
    if (this.db) { try { this.db.close(); } catch {} this.db = null; }
  }
}
