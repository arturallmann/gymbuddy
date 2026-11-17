import { describe, expect, test } from 'vitest';
import { listExerciseHistory, listExerciseUse } from './progress';
import { exercises, users } from './schema';
import { getLocalSettings } from './settings';
import { addSet, deleteSet } from './sets';
import { addWorkoutExercise, deleteWorkoutExercise } from './workoutExercises';
import { deleteWorkout, endWorkout, startWorkout } from './workouts';
import { createTestDatabase } from '@/testing/database';

const values = { setType: 'normal' as const, weightGrams: 60000, reps: 8, durationSeconds: null, distanceMeters: null, rpe: null, notes: null };

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const ids: Record<string, string> = {};
  for (const name of ['Squat', 'Row']) {
    ids[name] = crypto.randomUUID();
    await db.insert(exercises).values({ id: ids[name], source: 'custom', name, category: 'strength', loadType: 'external' });
  }
  return { db, userId, ids };
}

describe('listExerciseHistory', () => {
  test('list every set of the exercise, oldest workout first, in workout exercise and set order', async () => {
    const { db, userId, ids } = await setup();
    const newer = await startWorkout(db, userId, new Date('2026-10-20T10:00:00Z'));
    await addSet(db, await addWorkoutExercise(db, newer.id, ids['Squat']), { ...values, reps: 3 });
    await endWorkout(db, newer.id);
    const older = await startWorkout(db, userId, new Date('2026-10-01T10:00:00Z'));
    const first = await addWorkoutExercise(db, older.id, ids['Squat']);
    await addWorkoutExercise(db, older.id, ids['Row']);
    const again = await addWorkoutExercise(db, older.id, ids['Squat']);
    await addSet(db, again, { ...values, reps: 2 });
    await addSet(db, first, { ...values, reps: 1 });
    await addSet(db, first, { ...values, reps: 5, notes: 'belt' });
    await endWorkout(db, older.id);

    const rows = await listExerciseHistory(db, userId, ids['Squat']);

    expect(rows.map((row) => row.set.reps)).toEqual([1, 5, 2, 3]);
    expect(rows[0]).toMatchObject({ workoutId: older.id, startedAt: new Date('2026-10-01T10:00:00Z'), workoutExerciseId: first });
    expect(rows[1].set.notes).toBe('belt');
  });

  test('leave out deleted sets, workout exercises and workouts, other exercises and other users', async () => {
    const { db, userId, ids } = await setup();
    const workout = await startWorkout(db, userId);
    const squat = await addWorkoutExercise(db, workout.id, ids['Squat']);
    await addSet(db, squat, values);
    await deleteSet(db, await addSet(db, squat, values));
    const removed = await addWorkoutExercise(db, workout.id, ids['Squat']);
    await addSet(db, removed, values);
    await deleteWorkoutExercise(db, removed);
    await addSet(db, await addWorkoutExercise(db, workout.id, ids['Row']), values);
    await endWorkout(db, workout.id);
    const gone = await startWorkout(db, userId);
    await addSet(db, await addWorkoutExercise(db, gone.id, ids['Squat']), values);
    await deleteWorkout(db, gone.id);
    const otherId = crypto.randomUUID();
    await db.insert(users).values({ id: otherId });
    const theirs = await startWorkout(db, otherId);
    await addSet(db, await addWorkoutExercise(db, theirs.id, ids['Squat']), values);

    expect(await listExerciseHistory(db, userId, ids['Squat'])).toHaveLength(1);
  });
});

describe('listExerciseUse', () => {
  test('count the workouts per exercise and keep the newest start, without deleted rows or other users', async () => {
    const { db } = await createTestDatabase();
    const { userId } = await getLocalSettings(db);
    const squat = crypto.randomUUID();
    const goblet = crypto.randomUUID();
    await db.insert(exercises).values([
      { id: squat, source: 'custom', name: 'Barbell Squat', category: 'strength', loadType: 'external' },
      { id: goblet, source: 'custom', name: 'Goblet Squat', category: 'strength', loadType: 'external' },
    ]);
    const days = ['2026-11-01', '2026-11-05', '2026-11-08'];
    for (const day of days) {
      const workout = await startWorkout(db, userId, new Date(`${day}T10:00:00Z`));
      await addWorkoutExercise(db, workout.id, squat);
      // Twice in one workout still counts as one workout.
      if (day === '2026-11-05') await addWorkoutExercise(db, workout.id, squat);
      await endWorkout(db, workout.id, new Date(`${day}T11:00:00Z`));
    }
    const deleted = await startWorkout(db, userId, new Date('2026-11-10T10:00:00Z'));
    await addWorkoutExercise(db, deleted.id, squat);
    await deleteWorkout(db, deleted.id);
    const active = await startWorkout(db, userId, new Date('2026-11-12T10:00:00Z'));
    await deleteWorkoutExercise(db, await addWorkoutExercise(db, active.id, squat));
    await addWorkoutExercise(db, active.id, goblet);
    const other = crypto.randomUUID();
    await db.insert(users).values({ id: other });
    await addWorkoutExercise(db, (await startWorkout(db, other)).id, goblet);

    const use = await listExerciseUse(db, userId);

    expect(use.get(squat)).toEqual({ workouts: 3, lastAt: new Date('2026-11-08T10:00:00Z') });
    expect(use.get(goblet)).toEqual({ workouts: 1, lastAt: new Date('2026-11-12T10:00:00Z') });
    expect(use.size).toBe(2);
  });
});
