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

// Reads CSV text into rows of cells (RFC 4180): quoted cells may hold commas, quotes ("")
// and line breaks. A byte order mark at the start and empty lines are left out.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.startsWith(BOM) ? text.slice(1) : text;
  const endRow = () => {
    row.push(cell);
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
    cell = '';
  };
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      endRow();
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) endRow();
  return rows;
}
