import { expect, test } from 'vitest';
import { buildExportFile } from './exportFile';

const table = { header: ['Exercise', 'Reps'], rows: [['Squat', 8]] };

test('build a CSV file named after the day', async () => {
  const file = await buildExportFile(table, 'csv', new Date(2026, 9, 29));
  expect(file).toEqual({ name: 'gymbuddy-2026-10-29.csv', data: '﻿Exercise,Reps\r\nSquat,8\r\n', mimeType: 'text/csv' });
});
