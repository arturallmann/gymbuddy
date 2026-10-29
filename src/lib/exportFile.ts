// Builds the export file from the table. CSV is plain text; Excel comes in exportFile for 'xlsx'.
import { toCsv } from './csv';
import { exportFileName, type ExportTable } from './exportTable';

export type ExportFormat = 'csv' | 'xlsx';

export type ExportFile = { name: string; data: string | Uint8Array; mimeType: string };

export async function buildExportFile(table: ExportTable, format: ExportFormat, now: Date = new Date()): Promise<ExportFile> {
  if (format === 'csv') {
    return { name: exportFileName(now, 'csv'), data: toCsv(table), mimeType: 'text/csv' };
  }
  throw new Error(`Export format ${format} is not built yet`);
}
