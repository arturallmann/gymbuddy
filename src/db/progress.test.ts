import { describe, expect, test } from 'vitest';
import { listExerciseHistory } from './progress';
import { exercises, users } from './schema';
import { getLocalSettings } from './settings';
import { addSet, addWorkoutExercise, deleteSet, deleteWorkout, deleteWorkoutExercise, endWorkout, startWorkout } from './workouts';
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
