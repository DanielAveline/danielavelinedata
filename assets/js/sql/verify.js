
/**
 * Result verification utilities.
 * - canonicalize rows (order columns, sort rows, trim strings, round numerics)
 * - sha256 over CSV (header + rows)
 */
export const ResultVerifier = {
  numericPrecision: 4,

  setPrecision(n) { this.numericPrecision = n },

  orderColumns(columns, expectedOrder) {
    if (!expectedOrder || expectedOrder.length === 0) return columns.slice();
    const set = new Set(columns);
    const ordered = expectedOrder.filter(c => set.has(c));
    // Append any extra columns (shouldn't exist if puzzles define columns)
    for (const c of columns) if (!ordered.includes(c)) ordered.push(c);
    return ordered;
  },

  normalizeValue(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') {
      const factor = Math.pow(10, this.numericPrecision);
      return Math.round(v * factor) / factor;
    }
    return String(v).trim();
  },

  sortRows(rows, orderBy, columns) {
    if (!orderBy || orderBy.length === 0) {
      // default: sort by all columns ASC
      return rows.slice().sort((a, b) => {
        for (const c of columns) {
          const av = a[c]; const bv = b[c];
          if (av < bv) return -1;
          if (av > bv) return 1;
        }
        return 0;
      });
    }
    // parse order rules like "col DESC" or "col ASC"
    const rules = orderBy.map(rule => {
      const parts = rule.trim().split(/\s+/);
      return { col: parts[0], desc: (parts[1] || 'ASC').toUpperCase() === 'DESC' };
    });
    return rows.slice().sort((a, b) => {
      for (const r of rules) {
        const av = a[r.col]; const bv = b[r.col];
        if (av < bv) return r.desc ? 1 : -1;
        if (av > bv) return r.desc ? -1 : 1;
      }
      return 0;
    });
  },

  toCSV(columns, rows) {
    const esc = (x) => {
      const s = String(x);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const lines = [];
    lines.push(columns.join(','));
    for (const row of rows) {
      lines.push(columns.map(c => esc(row[c])).join(','));
    }
    return lines.join('\n');
  },

  async sha256Hex(str) {
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const bytes = Array.from(new Uint8Array(hash));
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async hashResult({ columns, rows }, expectedColumns, orderBy) {
    const cols = this.orderColumns(columns, expectedColumns);
    // normalize values
    const normRows = rows.map(r => {
      const o = {};
      for (const c of cols) o[c] = this.normalizeValue(r[c]);
      return o;
    });
    const sorted = this.sortRows(normRows, orderBy, cols);
    const csv = this.toCSV(cols, sorted);
    const hex = await this.sha256Hex(csv);
    return `sha256:${hex}`;
  },

  // Evaluate simple assertions
  evalAssertions({ columns, rows }, assertions = []) {
    const results = [];
    for (const a of assertions) {
      if (a.type === 'rowcount') {
        const ok = this.compare(rows.length, a.op, a.value);
        results.push({ ok, message: `rowcount ${a.op} ${a.value}`, got: rows.length });
      } else if (a.type === 'column') {
        const name = a.name;
        const ok = rows.every(r => this.compare(Number(r[name]), a.op, a.value));
        results.push({ ok, message: `column ${name} ${a.op} ${a.value}` });
      }
    }
    return { ok: results.every(r => r.ok), details: results };
  },

  compare(a, op, b) {
    switch (op) {
      case '=': return a === b;
      case '!=': return a !== b;
      case '>=': return a >= b;
      case '<=': return a <= b;
      case '>': return a > b;
      case '<': return a < b;
      default: return false;
    }
  }
};
