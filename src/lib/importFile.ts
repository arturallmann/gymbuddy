// Reads a picked file into a table: .xlsx through ExcelJS, everything else as CSV text.
import { parseCsv } from './csv';
import { fromXlsx } from './excel';
import type { Cell } from './exportTable';

export const IMPORT_ACCEPT = '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type PickedFile = Pick<File, 'name' | 'text' | 'arrayBuffer'>;

export async function readImportTable(file: PickedFile): Promise<Cell[][]> {
  if (file.name.toLowerCase().endsWith('.xlsx')) {
    return fromXlsx(new Uint8Array(await file.arrayBuffer()));
  }
  return parseCsv(await file.text());
}
