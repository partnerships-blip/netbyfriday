// One CSV cell. Cells starting with = + - @ (or a tab/return) can run as spreadsheet formulas, so they're prefixed
// with ' to stay text; quotes, commas and newlines are quoted per RFC 4180.
export const csvCell = (v: unknown) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = (rows: unknown[][]) => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
