import ExcelJS from 'exceljs';
import { expect, test } from 'vitest';
import { fromXlsx, toXlsx } from './excel';

test('write the header in bold and every value with its type', async () => {
  const bytes = await toXlsx({
    header: ['Date', 'Exercise', 'Weight', 'Reps', 'Notes'],
    rows: [
      ['2026-10-29', 'Kniebeuge', 22.5, 10, null],
      ['2026-10-29', 'Row', null, 8, 'Seat 4, "old" machine'],
    ],
  });

  const workbook = new ExcelJS.Workbook();
  // ExcelJS types expect its own Buffer type; the data is the same bytes.
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
  const sheet = workbook.getWorksheet('Sets')!;
  expect(sheet.getRow(1).values).toEqual([undefined, 'Date', 'Exercise', 'Weight', 'Reps', 'Notes']);
  expect(sheet.getRow(1).font?.bold).toBe(true);
  expect(sheet.getRow(2).values).toEqual([undefined, '2026-10-29', 'Kniebeuge', 22.5, 10]);
  expect(sheet.getCell('C2').value).toBe(22.5);
  expect(sheet.getCell('E3').value).toBe('Seat 4, "old" machine');
  expect(sheet.getCell('C3').value).toBeNull();
  expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
  expect(sheet.getColumn(5).width).toBe(23);
});

test('read back what toXlsx writes', async () => {
  const table = { header: ['Date', 'Weight', 'Notes'], rows: [['2026-10-29', 22.5, 'Seat 4, "old"'], ['2026-10-30', null, null]] };
  expect(await fromXlsx(await toXlsx(table))).toEqual([
    ['Date', 'Weight', 'Notes'],
    ['2026-10-29', 22.5, 'Seat 4, "old"'],
    ['2026-10-30', null, null],
  ]);
});

test('turn Excel dates and times back into text', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sets');
  sheet.addRow(['Date', 'Start time']);
  sheet.addRow([new Date(Date.UTC(2026, 9, 29)), new Date(Date.UTC(1899, 11, 30, 9, 47))]);
  const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());

  expect((await fromXlsx(bytes))[1]).toEqual(['2026-10-29', '09:47']);
});
