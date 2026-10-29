// CSV text for the export: comma separated, CRLF line ends, UTF-8 with a byte order mark,
// so spreadsheet apps read umlauts and other letters correctly (RFC 4180).
import type { Cell, ExportTable } from './exportTable';

const BOM = '﻿';

// Quotes a cell when it holds a comma, a quote or a line break.
export function csvCell(cell: Cell): string {
  if (cell === null) return '';
  const text = String(cell);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(table: ExportTable): string {
  const lines = [table.header, ...table.rows].map((row) => row.map(csvCell).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}
