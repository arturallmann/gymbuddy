import { expect, test } from 'vitest';
import { buildExportFile } from './exportFile';

const table = { header: ['Exercise', 'Reps'], rows: [['Squat', 8]] };

test('build a CSV file named after the day', async () => {
  const file = await buildExportFile(table, 'csv', new Date(2026, 9, 29));
  expect(file).toEqual({ name: 'gymbuddy-2026-10-29.csv', data: '﻿Exercise,Reps\r\nSquat,8\r\n', mimeType: 'text/csv' });
});

test('build an Excel file named after the day', async () => {
  const file = await buildExportFile(table, 'xlsx', new Date(2026, 9, 29));
  expect(file.name).toBe('gymbuddy-2026-10-29.xlsx');
  expect(file.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  // An .xlsx file is a zip archive, which starts with "PK".
  expect(Array.from((file.data as Uint8Array).slice(0, 2))).toEqual([0x50, 0x4b]);
});
