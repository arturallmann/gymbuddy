import { describe, expect, test } from 'vitest';
import { getLocalSettings } from './settings';
import { listHistoryUpTo, listStatistics } from './statistics';
import { addSet, addWorkoutExercise, deleteSet, deleteWorkout, endWorkout, startWorkout } from './workouts';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';

const values = (weightGrams: number, reps: number) => ({
  setType: 'normal' as const,
  weightGrams,
  reps,
  durationSeconds: null,
  distanceMeters: null,
  rpe: null,
  notes: null,
});

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const library = await addTestLibrary(db);
  const workout = async (startedAt: string, exerciseId: string, sets: [number, number][], end = true) => {
    const started = await startWorkout(db, userId, new Date(startedAt));
    const workoutExerciseId = await addWorkoutExercise(db, started.id, exerciseId);
    const ids = [];
    for (const [weight, reps] of sets) ids.push(await addSet(db, workoutExerciseId, values(weight, reps)));
    if (end) await endWorkout(db, started.id);
    return { ...started, setIds: ids };
  };
  return { db, userId, ...library, workout };
}

const span = { from: new Date('2026-11-01T00:00:00Z'), to: new Date('2026-11-15T00:00:00Z') };

describe('listStatistics', () => {
  test('list the sets of ended workouts in the span with their exercises and muscle groups', async () => {
    const { db, userId, press, curl, workout } = await setup();
    await workout('2026-11-03T10:00:00Z', press, [[60000, 8], [60000, 6]]);
    await workout('2026-11-05T10:00:00Z', curl, [[20000, 10]]);

    const { rows, exercises } = await listStatistics(db, userId, span);

    expect(rows.map((row) => [row.exerciseId, row.set.weightGrams, row.set.reps])).toEqual([
      [press, 60000, 8],
      [press, 60000, 6],
      [curl, 20000, 10],
    ]);
    expect(exercises.get(press)).toMatchObject({
      name: 'Bench Press',
      loadType: 'external',
      muscleGroups: [
        { name: 'Biceps', role: 'secondary' },
        { name: 'Chest', role: 'primary' },
      ],
    });
  });

  test('leave out workouts outside the span, the active workout, and deleted workouts and sets', async () => {
    const { db, userId, curl, workout } = await setup();
    await workout('2026-10-31T10:00:00Z', curl, [[1, 1]]);
    await workout('2026-11-15T10:00:00Z', curl, [[2, 1]]);
    const deleted = await workout('2026-11-03T10:00:00Z', curl, [[3, 1]]);
    await deleteWorkout(db, deleted.id);
    const kept = await workout('2026-11-04T10:00:00Z', curl, [[4, 1], [5, 1]]);
    await deleteSet(db, kept.setIds[1]);
    await workout('2026-11-06T10:00:00Z', curl, [[6, 1]], false);

    const { rows } = await listStatistics(db, userId, span);

    expect(rows.map((row) => row.set.weightGrams)).toEqual([4]);
  });
});

describe('listHistoryUpTo', () => {
  test('list the sets of the workout’s exercises from it and earlier workouts only', async () => {
    const { db, userId, press, curl, workout } = await setup();
    await workout('2026-11-01T10:00:00Z', press, [[50000, 5]]);
    await workout('2026-11-02T10:00:00Z', curl, [[20000, 5]]);
    const current = await workout('2026-11-03T10:00:00Z', press, [[55000, 5]]);
    await workout('2026-11-04T10:00:00Z', press, [[60000, 5]]);

    const rows = await listHistoryUpTo(db, userId, current);

    expect(rows.map((row) => [row.exerciseId, row.set.weightGrams])).toEqual([
      [press, 50000],
      [press, 55000],
    ]);
  });
});
