import { expect, test } from 'vitest';
import { csvCell, parseCsv, toCsv } from './csv';

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

test('read rows and cells, with quotes, commas and line breaks inside quotes', () => {
  expect(parseCsv('\uFEFFExercise,Notes\r\nSquat,"Seat 4, back 2"\r\nRow,"The ""old"" machine"\nCurl,"line 1\nline 2"\n')).toEqual([
    ['Exercise', 'Notes'],
    ['Squat', 'Seat 4, back 2'],
    ['Row', 'The "old" machine'],
    ['Curl', 'line 1\nline 2'],
  ]);
});

test('keep empty cells, drop empty lines, and read a last line without a line end', () => {
  expect(parseCsv('a,,c\r\n\r\n,b,\nx,y')).toEqual([
    ['a', '', 'c'],
    ['', 'b', ''],
    ['x', 'y'],
  ]);
});

test('read back what toCsv writes', () => {
  const table = { header: ['A', 'B'], rows: [['x, "y"', 2], [null, 'line\nbreak']] };
  expect(parseCsv(toCsv(table))).toEqual([['A', 'B'], ['x, "y"', '2'], ['', 'line\nbreak']]);
});
