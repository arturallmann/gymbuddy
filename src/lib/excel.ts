// Builds an .xlsx file from the export table with ExcelJS (decision 022).
// ExcelJS is large, so it loads only here, when the user exports.
import type { ExportTable } from './exportTable';

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
