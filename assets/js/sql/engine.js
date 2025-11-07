
/**
 * SQL Engine wrapper using sql.js (https://github.com/sql-js/sql.js)
 * Expected files in your repo:
 *   /assets/sql/sql-wasm.js
 *   /assets/sql/sql-wasm.wasm
 *
 * Usage:
 *   const engine = await SQLEngine.create('/assets/sql/sql-wasm.wasm');
 *   await engine.loadDB('/assets/sql/datasets/retail.sqlite');
 *   const res = engine.run('SELECT 1 AS x');
 */
export class SQLEngine {
  constructor(SQL) {
    this.SQL = SQL;
    this.db = null;
  }

  static async create(wasmUrl = '/assets/sql/sql-wasm.wasm', jsUrl = '/assets/sql/sql-wasm.js') {
    // Dynamically load sql-wasm.js if not already present
    if (!('initSqlJs' in window)) {
      await import(jsUrl).catch(() => {
        throw new Error('sql-wasm.js not found. Place sql.js distribution at /assets/sql/');
      });
    }
    const SQL = await window.initSqlJs({ locateFile: () => wasmUrl });
    return new SQLEngine(SQL);
  }

  async loadDB(dbUrl) {
    const resp = await fetch(dbUrl);
    if (!resp.ok) throw new Error(`Failed to fetch DB: ${dbUrl}`);
    const buf = await resp.arrayBuffer();
    this.db = new this.SQL.Database(new Uint8Array(buf));
  }

  run(sql, params = {}) {
    if (!this.db) throw new Error('Database not loaded');
    const stmt = this.db.prepare(sql);
    const rows = [];
    const cols = stmt.getColumnNames();
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return { columns: cols, rows };
  }

  export() {
    if (!this.db) return null;
    const binary = this.db.export();
    return new Blob([binary], { type: 'application/octet-stream' });
  }
}
