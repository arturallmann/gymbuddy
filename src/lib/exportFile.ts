// Builds the export file from the table: CSV text or an Excel workbook.
import { toCsv } from './csv';
import { toXlsx } from './excel';
import { exportFileName, type ExportTable } from './exportTable';

export type ExportFormat = 'csv' | 'xlsx';

export type ExportFile = { name: string; data: string | Uint8Array; mimeType: string };

export async function buildExportFile(table: ExportTable, format: ExportFormat, now: Date = new Date()): Promise<ExportFile> {
  if (format === 'csv') {
    return { name: exportFileName(now, 'csv'), data: toCsv(table), mimeType: 'text/csv' };
  }
  return {
    name: exportFileName(now, 'xlsx'),
    data: await toXlsx(table),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}
