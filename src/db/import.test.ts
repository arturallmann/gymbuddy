import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { listExportRows } from './export';
import { importWorkouts } from './import';
import { DEFAULT_REST_SECONDS, makeSuperset } from './groups';
import { exercises, sets, workoutGroups, workouts } from './schema';
import { getLocalSettings } from './settings';
import { addSet, addWorkoutExercise, endWorkout, startWorkout } from './workouts';
import { parseCsv, toCsv } from '@/lib/csv';
import { buildExportTable } from '@/lib/exportTable';
import { parseImportTable, type ImportWorkout } from '@/lib/importTable';
import type { SetValues } from '@/lib/sets';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';

const set = (values: Partial<SetValues>): SetValues => ({
  setType: 'normal',
  weightGrams: null,
  reps: null,
  durationSeconds: null,
  distanceMeters: null,
  rpe: null,
  notes: null,
  ...values,
});

const workout = (startedAt: Date, exercisesIn: ImportWorkout['exercises']): ImportWorkout => ({
  startedAt,
  endedAt: new Date(startedAt.getTime() + 45 * 60 * 1000),
  notes: 'Imported',
  exercises: exercisesIn,
});

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  await addTestLibrary(db);
  return { db, userId };
}

describe('importWorkouts', () => {
  test('add ended workouts with their workout exercises and sets, matching names in any case', async () => {
    const { db, userId } = await setup();
    const startedAt = new Date(2026, 9, 1, 9, 0);

    const result = await importWorkouts(db, userId, [
      workout(startedAt, [
        { name: 'barbell curl', loadType: 'external', phase: 'main', group: null, notes: 'EZ bar', sets: [set({ weightGrams: 20000, reps: 10 }), set({ weightGrams: 20000, reps: 8 })] },
        { name: 'Bench Press', loadType: 'external', phase: 'cooldown', group: null, notes: null, sets: [set({ weightGrams: 60000, reps: 5 })] },
      ]),
    ]);

    expect(result).toEqual({ addedWorkouts: 1, skippedWorkouts: 0, addedSets: 3, createdExercises: [] });
    const rows = await listExportRows(db, userId);
    expect(rows.map((row) => [row.exerciseName, row.phase, row.setPosition, row.reps, row.workoutExerciseNotes])).toEqual([
      ['Barbell Curl', 'main', 1, 10, 'EZ bar'],
      ['Barbell Curl', 'main', 2, 8, 'EZ bar'],
      ['Bench Press', 'cooldown', 1, 5, null],
    ]);
    expect(rows[0]).toMatchObject({ workoutStartedAt: startedAt, workoutNotes: 'Imported' });
    const [saved] = await db.select().from(workouts);
    expect(saved.endedAt).toEqual(new Date(startedAt.getTime() + 45 * 60 * 1000));
  });

  test('skip workouts whose start minute exists already, so importing twice changes nothing', async () => {
    const { db, userId } = await setup();
    const existing = await startWorkout(db, userId, new Date(2026, 9, 1, 9, 0, 42));
    await endWorkout(db, existing.id);
    const file = [
      workout(new Date(2026, 9, 1, 9, 0), [{ name: 'Barbell Curl', loadType: null, phase: 'main', group: null, notes: null, sets: [set({ reps: 1 })] }]),
      workout(new Date(2026, 9, 2, 9, 0), [{ name: 'Barbell Curl', loadType: null, phase: 'main', group: null, notes: null, sets: [set({ reps: 2 })] }]),
    ];

    expect(await importWorkouts(db, userId, file)).toMatchObject({ addedWorkouts: 1, skippedWorkouts: 1, addedSets: 1 });
    expect(await importWorkouts(db, userId, file)).toMatchObject({ addedWorkouts: 0, skippedWorkouts: 2, addedSets: 0 });
    expect(await db.select().from(workouts)).toHaveLength(2);
  });

  test('create one custom exercise per unknown name, with load type and tracked fields from the file', async () => {
    const { db, userId } = await setup();

    const result = await importWorkouts(db, userId, [
      workout(new Date(2026, 9, 1, 9, 0), [
        { name: 'Sled Push', loadType: null, phase: 'main', group: null, notes: null, sets: [set({ weightGrams: 80000, distanceMeters: 20 })] },
      ]),
      workout(new Date(2026, 9, 2, 9, 0), [
        { name: 'sled push', loadType: null, phase: 'main', group: null, notes: null, sets: [set({ durationSeconds: 30 })] },
        { name: 'Band Walk', loadType: 'none', phase: 'warmup', group: null, notes: null, sets: [set({ reps: 20 })] },
      ]),
    ]);

    expect(result.createdExercises).toEqual(['Sled Push', 'Band Walk']);
    const custom = await db.select().from(exercises).where(eq(exercises.source, 'custom'));
    expect(custom.map((row) => [row.name, row.userId, row.loadType, row.tracksReps, row.tracksDuration, row.tracksDistance])).toEqual([
      ['Sled Push', userId, 'external', false, true, true],
      ['Band Walk', userId, 'none', true, false, false],
    ]);
  });

  test('keep the user’s existing sets and add the imported ones next to them', async () => {
    const { db, userId } = await setup();
    const own = await startWorkout(db, userId, new Date(2026, 9, 5, 9, 0));
    const [curl] = await db.select().from(exercises).where(eq(exercises.name, 'Barbell Curl'));
    await addSet(db, await addWorkoutExercise(db, own.id, curl.id), set({ reps: 12 }));
    await endWorkout(db, own.id);

    await importWorkouts(db, userId, [workout(new Date(2026, 9, 1, 9, 0), [{ name: 'Barbell Curl', loadType: null, phase: 'main', group: null, notes: null, sets: [set({ reps: 3 })] }])]);

    expect((await listExportRows(db, userId)).map((row) => row.reps)).toEqual([3, 12]);
  });

  test('make one exercise group per group label in a workout, with its type and the default rest', async () => {
    const { db, userId } = await setup();

    await importWorkouts(db, userId, [
      workout(new Date(2026, 9, 1, 9, 0), [
        { name: 'Barbell Curl', loadType: null, phase: 'main', group: 'Superset 1', notes: null, sets: [set({ reps: 10 })] },
        { name: 'Bench Press', loadType: null, phase: 'main', group: 'Superset 1', notes: null, sets: [set({ reps: 8 })] },
        { name: 'Barbell Curl', loadType: null, phase: 'main', group: 'Giant set 2', notes: null, sets: [set({ reps: 6 })] },
        { name: 'Bench Press', loadType: null, phase: 'main', group: null, notes: null, sets: [set({ reps: 5 })] },
      ]),
    ]);

    const rows = await listExportRows(db, userId);
    expect(rows[0].groupId).toBe(rows[1].groupId);
    expect(rows[0].groupType).toBe('superset');
    expect(rows[2]).toMatchObject({ groupType: 'giant_set' });
    expect(rows[2].groupId).not.toBe(rows[0].groupId);
    expect(rows[3].groupId).toBeNull();
    const [group] = await db.select().from(workoutGroups).where(eq(workoutGroups.id, rows[0].groupId!));
    expect(group.restSeconds).toBe(DEFAULT_REST_SECONDS);
  });

  test('write nothing when the import fails part way', async () => {
    const { db, userId } = await setup();
    const broken = { name: null, loadType: null, phase: 'main', group: null, notes: null, sets: [] } as unknown as ImportWorkout['exercises'][number];

    await expect(
      importWorkouts(db, userId, [
        workout(new Date(2026, 9, 1, 9, 0), [{ name: 'Barbell Curl', loadType: null, phase: 'main', group: null, notes: null, sets: [set({ reps: 3 })] }]),
        workout(new Date(2026, 9, 2, 9, 0), [broken]),
      ]),
    ).rejects.toThrow();

    expect(await db.select().from(workouts)).toEqual([]);
    expect(await db.select().from(sets)).toEqual([]);
  });
});

test('import its own export into an empty app and export the same rows again', async () => {
  const { db, userId } = await setup();
  const [curl] = await db.select().from(exercises).where(eq(exercises.name, 'Barbell Curl'));
  const done = await startWorkout(db, userId, new Date(2026, 9, 1, 9, 0));
  const curlId = await addWorkoutExercise(db, done.id, curl.id, 'warmup');
  await addSet(db, curlId, set({ weightGrams: 20000, reps: 10, rpe: 7, notes: 'slow, "careful"', setType: 'warmup' }));
  await addSet(db, curlId, set({ weightGrams: 22500, reps: 8 }));
  const [press] = await db.select().from(exercises).where(eq(exercises.name, 'Bench Press'));
  const pressId = await addWorkoutExercise(db, done.id, press.id, 'warmup');
  await addSet(db, pressId, set({ weightGrams: 60000, reps: 5 }));
  await makeSuperset(db, done.id, [curlId, pressId]);
  await endWorkout(db, done.id, new Date(2026, 9, 1, 9, 50));
  const settings = { weightUnit: 'kg', distanceUnit: 'metric' } as const;
  const first = await listExportRows(db, userId);
  const csv = toCsv(buildExportTable(first, settings, new Map()));
  expect(csv).toContain(",Superset 1,");

  const empty = await createTestDatabase();
  const other = await getLocalSettings(empty.db);
  await addTestLibrary(empty.db);
  const parsed = parseImportTable(parseCsv(csv));
  if (!parsed.ok) throw new Error(parsed.errors.join('\n'));
  await importWorkouts(empty.db, other.userId, parsed.workouts);

  const again = await listExportRows(empty.db, other.userId);
  expect(toCsv(buildExportTable(again, settings, new Map()))).toBe(csv);
});
