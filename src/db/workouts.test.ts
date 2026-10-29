import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { exercises, sets, workoutExercises, workoutGroups, workouts } from './schema';
import { getLocalSettings } from './settings';
import {
  addSet,
  addWorkoutExercise,
  deleteSet,
  getLastSets,
  listSets,
  deleteWorkoutExercise,
  discardWorkout,
  endWorkout,
  getActiveWorkout,
  listWorkoutExercises,
  moveWorkoutExercise,
  startWorkout,
} from './workouts';
import { createTestDatabase } from '@/testing/database';

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  return { db, userId };
}

describe('startWorkout', () => {
  test('start a workout that becomes the active workout', async () => {
    const { db, userId } = await setup();
    const startedAt = new Date('2026-10-29T10:00:00Z');
    const workout = await startWorkout(db, userId, startedAt);

    expect(workout).toMatchObject({ userId, startedAt, endedAt: null, deletedAt: null });
    expect(await getActiveWorkout(db, userId)).toEqual(workout);
  });

  test('return the active workout instead of starting a second one', async () => {
    const { db, userId } = await setup();
    const first = await startWorkout(db, userId);
    const second = await startWorkout(db, userId);

    expect(second.id).toBe(first.id);
    expect(await db.select().from(workouts)).toHaveLength(1);
  });

  test('create one workout when two starts run at once', async () => {
    const { db, userId } = await setup();
    const [first, second] = await Promise.all([startWorkout(db, userId), startWorkout(db, userId)]);

    expect(second.id).toBe(first.id);
    expect(await db.select().from(workouts)).toHaveLength(1);
  });

  test('start a new workout after the last one ended or was deleted', async () => {
    const { db, userId } = await setup();
    const ended = await startWorkout(db, userId);
    await endWorkout(db, ended.id);
    const discarded = await startWorkout(db, userId);
    await discardWorkout(db, discarded.id);

    const next = await startWorkout(db, userId);

    expect([ended.id, discarded.id]).not.toContain(next.id);
    expect(await db.select().from(workouts)).toHaveLength(3);
  });
});

describe('getActiveWorkout', () => {
  test('return null without an active workout', async () => {
    const { db, userId } = await setup();
    expect(await getActiveWorkout(db, userId)).toBeNull();
  });

  test('ignore a deleted workout', async () => {
    const { db, userId } = await setup();
    const workout = await startWorkout(db, userId);
    await db.update(workouts).set({ deletedAt: new Date() }).where(eq(workouts.id, workout.id));

    expect(await getActiveWorkout(db, userId)).toBeNull();
  });
});

describe('endWorkout', () => {
  test('write the end time, so the workout is no longer active', async () => {
    const { db, userId } = await setup();
    const workout = await startWorkout(db, userId);
    const endedAt = new Date('2026-10-29T11:00:00Z');

    expect((await endWorkout(db, workout.id, endedAt)).endedAt).toEqual(endedAt);
    expect(await getActiveWorkout(db, userId)).toBeNull();
  });

  test('keep the first end time when it ends twice', async () => {
    const { db, userId } = await setup();
    const workout = await startWorkout(db, userId);
    const first = new Date('2026-10-29T11:00:00Z');
    await endWorkout(db, workout.id, first);

    expect((await endWorkout(db, workout.id, new Date('2026-10-29T12:00:00Z'))).endedAt).toEqual(first);
  });

  test('not end a deleted workout', async () => {
    const { db, userId } = await setup();
    const workout = await startWorkout(db, userId);
    await discardWorkout(db, workout.id);

    await expect(endWorkout(db, workout.id)).rejects.toThrow('not found');
  });
});

describe('discardWorkout', () => {
  test('delete the workout with its workout exercises, sets and exercise groups', async () => {
    const { db, userId } = await setup();
    const workout = await startWorkout(db, userId);
    const exerciseId = crypto.randomUUID();
    await db.insert(exercises).values({
      id: exerciseId,
      source: 'custom',
      name: 'My exercise',
      category: 'strength',
      loadType: 'external',
    });
    const groupId = crypto.randomUUID();
    await db.insert(workoutGroups).values({ id: groupId, workoutId: workout.id, groupType: 'superset' });
    const workoutExerciseId = crypto.randomUUID();
    await db
      .insert(workoutExercises)
      .values({ id: workoutExerciseId, workoutId: workout.id, exerciseId, position: 1, groupId });
    await db.insert(sets).values({ workoutExerciseId, position: 1, reps: 10 });

    const deletedAt = new Date('2026-10-29T11:00:00Z');
    await discardWorkout(db, workout.id, deletedAt);

    expect(await getActiveWorkout(db, userId)).toBeNull();
    for (const table of [workouts, workoutGroups, workoutExercises, sets]) {
      const rows = await db.select({ deletedAt: table.deletedAt }).from(table);
      expect(rows).toEqual([{ deletedAt }]);
    }
  });

  test('leave other workouts as they are', async () => {
    const { db, userId } = await setup();
    const kept = await startWorkout(db, userId);
    await endWorkout(db, kept.id);
    const discarded = await startWorkout(db, userId);

    await discardWorkout(db, discarded.id);

    const [row] = await db.select().from(workouts).where(eq(workouts.id, kept.id));
    expect(row.deletedAt).toBeNull();
  });
});

describe('workout exercises', () => {
  async function withExercises(...names: string[]) {
    const { db, userId } = await setup();
    const workout = await startWorkout(db, userId);
    const ids: Record<string, string> = {};
    for (const name of names) {
      ids[name] = crypto.randomUUID();
      await db
        .insert(exercises)
        .values({ id: ids[name], source: 'custom', name, category: 'strength', loadType: 'external' });
    }
    const names_ = async () => (await listWorkoutExercises(db, workout.id)).map((item) => item.name);
    return { db, workout, ids, names: names_ };
  }

  test('add exercises at the end, in the order they were added', async () => {
    const { db, workout, ids, names } = await withExercises('Squat', 'Bench Press');
    await addWorkoutExercise(db, workout.id, ids['Squat']);
    await addWorkoutExercise(db, workout.id, ids['Bench Press']);

    expect(await names()).toEqual(['Squat', 'Bench Press']);
    expect((await listWorkoutExercises(db, workout.id)).map((item) => item.position)).toEqual([1, 2]);
  });

  test('allow the same exercise twice', async () => {
    const { db, workout, ids, names } = await withExercises('Squat');
    await addWorkoutExercise(db, workout.id, ids['Squat']);
    await addWorkoutExercise(db, workout.id, ids['Squat']);

    expect(await names()).toEqual(['Squat', 'Squat']);
  });

  test('give two adds at once different positions', async () => {
    const { db, workout, ids } = await withExercises('Squat', 'Bench Press');
    await Promise.all([
      addWorkoutExercise(db, workout.id, ids['Squat']),
      addWorkoutExercise(db, workout.id, ids['Bench Press']),
    ]);

    const positions = (await listWorkoutExercises(db, workout.id)).map((item) => item.position);
    expect(positions).toEqual([1, 2]);
  });

  test('move a workout exercise up and down', async () => {
    const { db, workout, ids, names } = await withExercises('Squat', 'Bench Press', 'Row');
    for (const name of ['Squat', 'Bench Press', 'Row']) await addWorkoutExercise(db, workout.id, ids[name]);
    const [squat, , row] = await listWorkoutExercises(db, workout.id);

    await moveWorkoutExercise(db, row.id, 'up');
    expect(await names()).toEqual(['Squat', 'Row', 'Bench Press']);

    await moveWorkoutExercise(db, squat.id, 'down');
    expect(await names()).toEqual(['Row', 'Squat', 'Bench Press']);
  });

  test('keep the order when the first moves up or the last moves down', async () => {
    const { db, workout, ids, names } = await withExercises('Squat', 'Row');
    await addWorkoutExercise(db, workout.id, ids['Squat']);
    await addWorkoutExercise(db, workout.id, ids['Row']);
    const [squat, row] = await listWorkoutExercises(db, workout.id);

    await moveWorkoutExercise(db, squat.id, 'up');
    await moveWorkoutExercise(db, row.id, 'down');

    expect(await names()).toEqual(['Squat', 'Row']);
  });

  test('delete a workout exercise with its sets, and skip it when moving', async () => {
    const { db, workout, ids, names } = await withExercises('Squat', 'Bench Press', 'Row');
    for (const name of ['Squat', 'Bench Press', 'Row']) await addWorkoutExercise(db, workout.id, ids[name]);
    const [, bench, row] = await listWorkoutExercises(db, workout.id);
    await db.insert(sets).values({ workoutExerciseId: bench.id, position: 1, reps: 5 });

    await deleteWorkoutExercise(db, bench.id);
    expect(await names()).toEqual(['Squat', 'Row']);
    const [set] = await db.select().from(sets);
    expect(set.deletedAt).not.toBeNull();

    await moveWorkoutExercise(db, row.id, 'up');
    expect(await names()).toEqual(['Row', 'Squat']);
    await expect(moveWorkoutExercise(db, bench.id, 'up')).rejects.toThrow('not found');
  });

  test('add after a deleted last exercise without a gap problem', async () => {
    const { db, workout, ids, names } = await withExercises('Squat', 'Row');
    const squatId = await addWorkoutExercise(db, workout.id, ids['Squat']);
    await deleteWorkoutExercise(db, squatId);
    await addWorkoutExercise(db, workout.id, ids['Row']);

    expect(await names()).toEqual(['Row']);
  });
});

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
    await discardWorkout(db, discarded.id);

    const today = await startWorkout(db, userId, new Date('2026-10-30T10:00:00Z'));

    expect((await getLastSets(db, exerciseId, today.id)).map((set) => set.id)).toEqual([kept]);
  });

  test('return no last sets for a new exercise', async () => {
    const { db, exerciseId, workout } = await withWorkoutExercise();
    expect(await getLastSets(db, exerciseId, workout.id)).toEqual([]);
  });
});
