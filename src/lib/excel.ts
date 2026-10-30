// Builds an .xlsx file from the export table with ExcelJS (decision 022).
// ExcelJS is large, so it loads only here, when the user exports.
import type { Cell, ExportTable } from './exportTable';

const MAX_COLUMN_WIDTH = 40;

export async function toXlsx(table: ExportTable): Promise<Uint8Array> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gymbuddy';
  const sheet = workbook.addWorksheet('Sets', { views: [{ state: 'frozen', ySplit: 1 }] });

  sheet.addRow(table.header).font = { bold: true };
  for (const row of table.rows) {
    sheet.addRow(row);
  }
  // Wide enough for the longest value in each column, up to a limit.
  table.header.forEach((title, index) => {
    const longest = Math.max(title.length, ...table.rows.map((row) => String(row[index] ?? '').length));
    sheet.getColumn(index + 1).width = Math.min(longest + 2, MAX_COLUMN_WIDTH);
  });

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

const pad = (value: number) => String(value).padStart(2, '0');

// One cell as text or a number. Excel keeps dates and times as dates: a time alone has the
// date 1899-12-30, so it becomes "09:47"; a date becomes "2026-10-29".
function cellValue(value: unknown): Cell {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value === 'boolean') return String(value);
  if (value instanceof Date) {
    return value.getUTCFullYear() <= 1900
      ? `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`
      : `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  if (typeof value === 'object') {
    const object = value as { result?: unknown; text?: unknown; richText?: { text: string }[] };
    if (object.richText) return object.richText.map((part) => part.text).join('');
    if ('result' in object) return cellValue(object.result);
    if (typeof object.text === 'string') return object.text;
  }
  return String(value);
}

// Reads the first sheet of an .xlsx file into rows of cells. Empty rows are left out.
export async function fromXlsx(bytes: Uint8Array): Promise<Cell[][]> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const width = sheet.columnCount;
  const rows: Cell[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    rows.push(Array.from({ length: width }, (_, index) => cellValue(row.getCell(index + 1).value)));
  });
  return rows;
}
