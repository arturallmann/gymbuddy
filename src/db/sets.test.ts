import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { exercises, sets } from './schema';
import { getLocalSettings } from './settings';
import { addSet, deleteSet, getLastSets, listSets, updateSet } from './sets';
import { addWorkoutExercise } from './workoutExercises';
import { deleteWorkout, endWorkout, startWorkout } from './workouts';
import { createTestDatabase } from '@/testing/database';

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  return { db, userId };
}

describe('sets', () => {
  const values = {
    setType: 'normal' as const,
    weightGrams: 60000,
    reps: 8,
    durationSeconds: null,
    distanceMeters: null,
    rpe: null,
    notes: null,
  };

  async function withWorkoutExercise() {
    const { db, userId } = await setup();
    const exerciseId = crypto.randomUUID();
    await db
      .insert(exercises)
      .values({ id: exerciseId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external' });
    const workout = await startWorkout(db, userId, new Date('2026-10-29T10:00:00Z'));
    const workoutExerciseId = await addWorkoutExercise(db, workout.id, exerciseId);
    return { db, userId, exerciseId, workout, workoutExerciseId };
  }

  test('log sets in order, with the time they were done', async () => {
    const { db, workoutExerciseId } = await withWorkoutExercise();
    const completedAt = new Date('2026-10-29T10:05:00Z');
    await addSet(db, workoutExerciseId, values, completedAt);
    await addSet(db, workoutExerciseId, { ...values, reps: 6 });

    const logged = await listSets(db, workoutExerciseId);
    expect(logged.map((set) => [set.position, set.reps])).toEqual([
      [1, 8],
      [2, 6],
    ]);
    expect(logged[0]).toMatchObject({ weightGrams: 60000, completedAt });
  });

  test('give two sets logged at once different positions', async () => {
    const { db, workoutExerciseId } = await withWorkoutExercise();
    await Promise.all([addSet(db, workoutExerciseId, values), addSet(db, workoutExerciseId, values)]);

    expect((await listSets(db, workoutExerciseId)).map((set) => set.position)).toEqual([1, 2]);
  });

  test('delete a set and leave it out of the list', async () => {
    const { db, workoutExerciseId } = await withWorkoutExercise();
    const id = await addSet(db, workoutExerciseId, values);
    await addSet(db, workoutExerciseId, { ...values, reps: 6 });

    await deleteSet(db, id);

    expect((await listSets(db, workoutExerciseId)).map((set) => set.reps)).toEqual([6]);
    const [row] = await db.select().from(sets).where(eq(sets.id, id));
    expect(row.deletedAt).not.toBeNull();
  });

  test('return the sets of the newest other workout with this exercise', async () => {
    const { db, userId, exerciseId, workout, workoutExerciseId } = await withWorkoutExercise();
    await addSet(db, workoutExerciseId, values);
    await addSet(db, workoutExerciseId, { ...values, reps: 6 });
    await endWorkout(db, workout.id);

    const older = await startWorkout(db, userId, new Date('2026-10-01T10:00:00Z'));
    await addSet(db, await addWorkoutExercise(db, older.id, exerciseId), { ...values, reps: 3 });
    await endWorkout(db, older.id);

    const today = await startWorkout(db, userId, new Date('2026-10-30T10:00:00Z'));
    await addSet(db, await addWorkoutExercise(db, today.id, exerciseId), { ...values, reps: 1 });

    expect((await getLastSets(db, exerciseId, today.id)).map((set) => set.reps)).toEqual([8, 6]);
  });

  test('skip deleted sets, workout exercises and workouts when looking for the last sets', async () => {
    const { db, userId, exerciseId, workout, workoutExerciseId } = await withWorkoutExercise();
    const kept = await addSet(db, workoutExerciseId, values);
    await deleteSet(db, await addSet(db, workoutExerciseId, { ...values, reps: 99 }));
    await endWorkout(db, workout.id);

    const discarded = await startWorkout(db, userId, new Date('2026-10-29T12:00:00Z'));
    await addSet(db, await addWorkoutExercise(db, discarded.id, exerciseId), { ...values, reps: 50 });
    await deleteWorkout(db, discarded.id);

    const today = await startWorkout(db, userId, new Date('2026-10-30T10:00:00Z'));

    expect((await getLastSets(db, exerciseId, today.id)).map((set) => set.id)).toEqual([kept]);
  });

  test('return no last sets for a new exercise', async () => {
    const { db, exerciseId, workout } = await withWorkoutExercise();
    expect(await getLastSets(db, exerciseId, workout.id)).toEqual([]);
  });
});

describe('updateSet', () => {
  test('change the values and keep position and completion time', async () => {
    const { db, userId } = await setup();
    const exerciseId = crypto.randomUUID();
    await db
      .insert(exercises)
      .values({ id: exerciseId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external' });
    const workout = await startWorkout(db, userId);
    const workoutExerciseId = await addWorkoutExercise(db, workout.id, exerciseId);
    const values = { setType: 'normal' as const, weightGrams: 60000, reps: 8, durationSeconds: null, distanceMeters: null, rpe: null, notes: null };
    const completedAt = new Date('2026-10-29T10:00:00Z');
    const id = await addSet(db, workoutExerciseId, values, completedAt);

    await updateSet(db, id, { ...values, reps: 6, notes: 'grip slipped' });

    const [set] = await listSets(db, workoutExerciseId);
    expect(set).toMatchObject({ id, position: 1, completedAt, reps: 6, notes: 'grip slipped', weightGrams: 60000 });
  });

  test('not change a deleted set', async () => {
    const { db, userId } = await setup();
    const exerciseId = crypto.randomUUID();
    await db
      .insert(exercises)
      .values({ id: exerciseId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external' });
    const workout = await startWorkout(db, userId);
    const workoutExerciseId = await addWorkoutExercise(db, workout.id, exerciseId);
    const values = { setType: 'normal' as const, weightGrams: 60000, reps: 8, durationSeconds: null, distanceMeters: null, rpe: null, notes: null };
    const id = await addSet(db, workoutExerciseId, values);
    await deleteSet(db, id);

    await updateSet(db, id, { ...values, reps: 1 });

    const [row] = await db.select().from(sets).where(eq(sets.id, id));
    expect(row.reps).toBe(8);
  });
});
