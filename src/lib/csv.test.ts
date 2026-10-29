import { expect, test } from 'vitest';
import { csvCell, toCsv } from './csv';

test('quote cells with commas, quotes or line breaks, and leave others as they are', () => {
  expect(csvCell('Bench Press')).toBe('Bench Press');
  expect(csvCell('Seat 4, back 2')).toBe('"Seat 4, back 2"');
  expect(csvCell('The "old" machine')).toBe('"The ""old"" machine"');
  expect(csvCell('line 1\nline 2')).toBe('"line 1\nline 2"');
  expect(csvCell(12.5)).toBe('12.5');
  expect(csvCell(null)).toBe('');
});

test('write a BOM, the header and one line per row with CRLF', () => {
  const csv = toCsv({ header: ['Exercise', 'Reps'], rows: [['Kniebeuge', 8], ['Row', null]] });
  expect(csv).toBe('﻿Exercise,Reps\r\nKniebeuge,8\r\nRow,\r\n');
});
