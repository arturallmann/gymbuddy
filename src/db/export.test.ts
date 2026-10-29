import { describe, expect, test } from 'vitest';
import { listExportRows } from './export';
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

describe('listExportRows', () => {
  test('list every set in workout, workout exercise and set order', async () => {
    const { db, userId, ids } = await setup();
    const newer = await startWorkout(db, userId, new Date('2026-10-20T10:00:00Z'));
    const row = await addWorkoutExercise(db, newer.id, ids['Row']);
    await addSet(db, row, { ...values, reps: 12 });
    await endWorkout(db, newer.id);
    const older = await startWorkout(db, userId, new Date('2026-10-01T10:00:00Z'));
    const squat = await addWorkoutExercise(db, older.id, ids['Squat']);
    const row2 = await addWorkoutExercise(db, older.id, ids['Row']);
    await addSet(db, squat, values);
    await addSet(db, row2, { ...values, reps: 10, notes: 'slow' });
    await addSet(db, squat, { ...values, reps: 6 });

    const rows = await listExportRows(db, userId);
    expect(rows.map((r) => [r.exerciseName, r.setPosition, r.reps])).toEqual([
      ['Squat', 1, 8],
      ['Squat', 2, 6],
      ['Row', 1, 10],
      ['Row', 1, 12],
    ]);
    expect(rows[2]).toMatchObject({ setNotes: 'slow', phase: 'main', loadType: 'external', workoutStartedAt: new Date('2026-10-01T10:00:00Z') });
  });

  test('leave out deleted sets, workout exercises and workouts, and other users’ workouts', async () => {
    const { db, userId, ids } = await setup();
    const workout = await startWorkout(db, userId);
    const squat = await addWorkoutExercise(db, workout.id, ids['Squat']);
    await addSet(db, squat, values);
    await deleteSet(db, await addSet(db, squat, values));
    const row = await addWorkoutExercise(db, workout.id, ids['Row']);
    await addSet(db, row, values);
    await deleteWorkoutExercise(db, row);
    await endWorkout(db, workout.id);
    const deleted = await startWorkout(db, userId);
    await addSet(db, await addWorkoutExercise(db, deleted.id, ids['Squat']), values);
    await deleteWorkout(db, deleted.id);
    const otherId = crypto.randomUUID();
    await db.insert(users).values({ id: otherId });
    const theirs = await startWorkout(db, otherId);
    await addSet(db, await addWorkoutExercise(db, theirs.id, ids['Squat']), values);

    const rows = await listExportRows(db, userId);
    expect(rows).toHaveLength(1);
    expect(rows[0].exerciseName).toBe('Squat');
  });

  test('return no rows without sets', async () => {
    const { db, userId } = await setup();
    expect(await listExportRows(db, userId)).toEqual([]);
  });
});
