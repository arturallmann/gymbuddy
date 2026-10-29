import { expect, test } from 'vitest';
import { toCsv } from './csv';
import { toXlsx } from './excel';
import { readImportTable } from './importFile';

const table = { header: ['Exercise', 'Reps'], rows: [['Squat', 8]] };

function picked(name: string, data: string | Uint8Array) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return {
    name,
    text: async () => new TextDecoder().decode(bytes),
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  };
}

test('read a CSV file', async () => {
  expect(await readImportTable(picked('export.csv', toCsv(table)))).toEqual([['Exercise', 'Reps'], ['Squat', '8']]);
});

test('read an Excel file by its extension', async () => {
  expect(await readImportTable(picked('Export.XLSX', await toXlsx(table)))).toEqual([['Exercise', 'Reps'], ['Squat', 8]]);
});
