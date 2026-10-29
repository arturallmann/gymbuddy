import { describe, expect, test } from 'vitest';
import type { ExportRow } from '@/db/export';
import { parseCsv, toCsv } from './csv';
import { EXPORT_HEADER, buildExportTable } from './exportTable';
import { parseImportTable } from './importTable';

const base: ExportRow = {
  workoutStartedAt: new Date(2026, 9, 29, 9, 7),
  workoutEndedAt: new Date(2026, 9, 29, 10, 2),
  workoutNotes: 'Short sleep',
  exerciseId: 'squat',
  exerciseName: 'Squat',
  loadType: 'external',
  phase: 'main',
  workoutExerciseNotes: 'Old rack',
  setPosition: 1,
  setType: 'normal',
  weightGrams: 60000,
  reps: 8,
  durationSeconds: null,
  distanceMeters: null,
  rpe: 8.5,
  setNotes: 'belt',
};

const table = (...rows: (string | number | null)[][]) => [EXPORT_HEADER, ...rows];
const row = (values: Partial<Record<string, string | number | null>>) =>
  EXPORT_HEADER.map((column) => (column in values ? values[column]! : null));

describe('parseImportTable', () => {
  test('read back an export: workouts, workout exercises and sets in storage units', () => {
    const rows: ExportRow[] = [
      base,
      { ...base, setPosition: 2, reps: 6, rpe: null, setNotes: null },
      { ...base, exerciseId: 'run', exerciseName: 'Run', loadType: 'none', phase: 'cooldown', workoutExerciseNotes: null, setPosition: 1, weightGrams: null, reps: null, durationSeconds: 1500, distanceMeters: 5000, rpe: null, setNotes: null, setType: 'warmup' },
      { ...base, workoutStartedAt: new Date(2026, 9, 30, 18, 0), workoutEndedAt: null, workoutNotes: null, loadType: 'bodyweight', weightGrams: -20000 },
    ];
    const csv = toCsv(buildExportTable(rows, { weightUnit: 'kg', distanceUnit: 'metric' }, new Map()));

    const parsed = parseImportTable(parseCsv(csv));

    expect(parsed).toMatchObject({ ok: true, setCount: 4 });
    if (!parsed.ok) return;
    const [first, second] = parsed.workouts;
    expect(first).toMatchObject({ startedAt: new Date(2026, 9, 29, 9, 7), endedAt: new Date(2026, 9, 29, 10, 2), notes: 'Short sleep' });
    expect(first.exercises).toEqual([
      {
        name: 'Squat',
        loadType: 'external',
        phase: 'main',
        notes: 'Old rack',
        sets: [
          { setType: 'normal', weightGrams: 60000, reps: 8, durationSeconds: null, distanceMeters: null, rpe: 8.5, notes: 'belt' },
          { setType: 'normal', weightGrams: 60000, reps: 6, durationSeconds: null, distanceMeters: null, rpe: null, notes: null },
        ],
      },
      {
        name: 'Run',
        loadType: 'none',
        phase: 'cooldown',
        notes: null,
        sets: [{ setType: 'warmup', weightGrams: null, reps: null, durationSeconds: 1500, distanceMeters: 5000, rpe: null, notes: null }],
      },
    ]);
    expect(second).toMatchObject({ startedAt: new Date(2026, 9, 30, 18, 0), endedAt: new Date(2026, 9, 30, 18, 0) });
    expect(second.exercises[0]).toMatchObject({ loadType: 'bodyweight', sets: [{ weightGrams: -20000 }] });
  });

  test('convert pounds, miles and m:ss durations to storage units', () => {
    const parsed = parseImportTable(
      table(row({ Date: '2026-10-29', 'Start time': '07:00', Exercise: 'Row', Weight: '45', 'Weight unit': 'LB', Reps: 5, 'Duration (s)': '1:30', Distance: '3,1', 'Distance unit': 'mi' })),
    );

    expect(parsed.ok && parsed.workouts[0].exercises[0].sets[0]).toMatchObject({
      weightGrams: 20412,
      reps: 5,
      durationSeconds: 90,
      distanceMeters: 4989,
    });
  });

  test('start a new workout exercise when the set number does not go up', () => {
    const parsed = parseImportTable(
      table(
        row({ Date: '2026-10-29', 'Start time': '07:00', Exercise: 'Squat', Set: 1, Reps: 5 }),
        row({ Date: '2026-10-29', 'Start time': '07:00', Exercise: 'Squat', Set: 2, Reps: 5 }),
        row({ Date: '2026-10-29', 'Start time': '07:00', Exercise: 'squat', Set: 1, Reps: 3 }),
      ),
    );

    expect(parsed.ok && parsed.workouts[0].exercises.map((exercise) => exercise.sets.length)).toEqual([2, 1]);
  });

  test('let a workout that ends after midnight end on the next day', () => {
    const parsed = parseImportTable(table(row({ Date: '2026-10-29', 'Start time': '23:30', 'End time': '00:15', Exercise: 'Squat', Reps: 5 })));

    expect(parsed.ok && parsed.workouts[0].endedAt).toEqual(new Date(2026, 9, 30, 0, 15));
  });

  test('find columns by their header in any order and case', () => {
    const parsed = parseImportTable([
      ['reps', 'EXERCISE', 'start time', 'date'],
      [8, 'Squat', '07:00', '2026-10-29'],
    ]);

    expect(parsed).toMatchObject({ ok: true, setCount: 1 });
  });

  test('list every problem with its row number and import nothing', () => {
    const parsed = parseImportTable(
      table(
        row({ Date: '2026-10-29', 'Start time': '07:00', Exercise: 'Squat', Reps: 'abc' }),
        row({ Date: '29.10.2026', 'Start time': '07:00', Exercise: 'Squat' }),
        row({ Date: '2026-10-29', 'Start time': '07:00', Exercise: 'Squat', Weight: 20 }),
        row({ Date: '2026-10-29', 'Start time': '07:00', Exercise: '', Reps: 5 }),
        row({ Date: '2026-10-29', 'Start time': '07:00', Exercise: 'Squat', 'Set type': 'heavy' }),
        row({ Date: '2026-02-30', 'Start time': '25:00', Exercise: 'Squat' }),
      ),
    );

    expect(parsed).toEqual({
      ok: false,
      errors: [
        'Row 2: Reps must be a whole number, not "abc".',
        'Row 3: Date must look like 2026-10-29, not "29.10.2026".',
        'Row 4: Weight unit must be kg or lb, not "".',
        'Row 5: Exercise is empty.',
        'Row 6: Unknown set type "heavy".',
        'Row 7: "2026-02-30 25:00" is not a real date and time.',
      ],
    });
  });

  test('name missing columns, and refuse an empty file', () => {
    expect(parseImportTable([['Exercise', 'Reps']])).toEqual({ ok: false, errors: ['The file has no column "Date", "Start time".'] });
    expect(parseImportTable([])).toEqual({ ok: false, errors: ['The file is empty.'] });
    expect(parseImportTable([EXPORT_HEADER, EXPORT_HEADER.map(() => '')])).toEqual({ ok: false, errors: ['The file has no sets.'] });
  });
});
