import { describe, expect, test } from 'vitest';
import type { ExportRow } from '@/db/export';
import { EXPORT_HEADER, buildExportTable, exportDate, exportFileName, exportTime } from './exportTable';

const row: ExportRow = {
  workoutStartedAt: new Date(2026, 9, 29, 9, 7),
  workoutEndedAt: new Date(2026, 9, 29, 10, 2),
  workoutNotes: 'Short sleep',
  exerciseId: 'squat',
  exerciseName: 'Squat',
  loadType: 'external',
  phase: 'main',
  workoutExerciseNotes: null,
  setPosition: 1,
  setType: 'normal',
  weightGrams: 60000,
  reps: 8,
  durationSeconds: null,
  distanceMeters: null,
  rpe: 8.5,
  setNotes: 'belt',
};
const kg = { weightUnit: 'kg', distanceUnit: 'metric' } as const;
const cell = (values: unknown[], name: string) => values[EXPORT_HEADER.indexOf(name)];

describe('buildExportTable', () => {
  test('write one row per set with date, exercise and values in display units', () => {
    const { header, rows } = buildExportTable([row], kg, new Map());

    expect(header).toBe(EXPORT_HEADER);
    expect(rows[0]).toEqual([
      '2026-10-29', '09:07', '10:02', 'Squat', 'Main phase', 1, 'Normal set', 'Weight', 60, 'kg', 8, null, null, null, 8.5, 'belt', null, 'Short sleep',
    ]);
  });

  test('use the unit override of the exercise, and the settings for other exercises', () => {
    const { rows } = buildExportTable(
      [{ ...row, weightGrams: 20412 }, { ...row, exerciseId: 'press', weightGrams: 20412 }],
      kg,
      new Map([['squat', { weightUnit: 'lb', distanceUnit: null }]]),
    );

    expect([cell(rows[0], 'Weight'), cell(rows[0], 'Weight unit')]).toEqual([45, 'lb']);
    expect([cell(rows[1], 'Weight'), cell(rows[1], 'Weight unit')]).toEqual([20.4, 'kg']);
  });

  test('write added weight for bodyweight, nothing for bodyweight only and no weight', () => {
    const { rows } = buildExportTable(
      [
        { ...row, loadType: 'bodyweight', weightGrams: -20000 },
        { ...row, loadType: 'bodyweight', weightGrams: null },
        { ...row, loadType: 'none', weightGrams: 5000 },
      ],
      kg,
      new Map(),
    );

    expect(rows.map((values) => [cell(values, 'Load type'), cell(values, 'Weight'), cell(values, 'Weight unit')])).toEqual([
      ['Bodyweight + added weight', -20, 'kg'],
      ['Bodyweight + added weight', null, null],
      ['No weight', null, null],
    ]);
  });

  test('write duration in seconds and distance in the display unit', () => {
    const { rows } = buildExportTable(
      [{ ...row, loadType: 'none', weightGrams: null, reps: null, durationSeconds: 1500, distanceMeters: 5000, phase: 'cooldown', setType: 'warmup' }],
      { weightUnit: 'lb', distanceUnit: 'imperial' },
      new Map(),
    );

    expect(cell(rows[0], 'Duration (s)')).toBe(1500);
    expect([cell(rows[0], 'Distance'), cell(rows[0], 'Distance unit')]).toEqual([3.11, 'mi']);
    expect([cell(rows[0], 'Phase'), cell(rows[0], 'Set type')]).toEqual(['Cool-down phase', 'Warm-up set']);
  });
});

test('write local dates, times and file names', () => {
  const date = new Date(2026, 0, 5, 7, 3);
  expect(exportDate(date)).toBe('2026-01-05');
  expect(exportTime(date)).toBe('07:03');
  expect(exportFileName(date, 'xlsx')).toBe('gymbuddy-2026-01-05.xlsx');
});
