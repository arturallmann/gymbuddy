import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { exercises, sets, workoutExercises, workoutGroups, workouts } from './schema';
import { getLocalSettings } from './settings';
import { addSet, deleteSet } from './sets';
import { addWorkoutExercise, deleteWorkoutExercise } from './workoutExercises';
import { getWorkout, listWorkoutHistory, deleteWorkout, endWorkout, getActiveWorkout, startWorkout } from './workouts';
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
    await deleteWorkout(db, discarded.id);

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
    await deleteWorkout(db, workout.id);

    await expect(endWorkout(db, workout.id)).rejects.toThrow('not found');
  });
});

describe('deleteWorkout', () => {
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
    await deleteWorkout(db, workout.id, deletedAt);

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

    await deleteWorkout(db, discarded.id);

    const [row] = await db.select().from(workouts).where(eq(workouts.id, kept.id));
    expect(row.deletedAt).toBeNull();
  });
});

describe('workout history', () => {
  test('list only workouts that started in a time span, such as today', async () => {
    const { db, userId } = await setup();
    for (const [start, end] of [
      ['2026-11-14T23:30:00Z', '2026-11-15T00:30:00Z'],
      ['2026-11-15T08:00:00Z', '2026-11-15T09:00:00Z'],
      ['2026-11-16T00:00:00Z', '2026-11-16T01:00:00Z'],
    ]) {
      const workout = await startWorkout(db, userId, new Date(start));
      await endWorkout(db, workout.id, new Date(end));
    }
    await startWorkout(db, userId, new Date('2026-11-15T10:00:00Z'));

    const found = await listWorkoutHistory(db, userId, {
      from: new Date('2026-11-15T00:00:00Z'),
      to: new Date('2026-11-16T00:00:00Z'),
    });

    expect(found.map((workout) => workout.startedAt)).toEqual([new Date('2026-11-15T08:00:00Z')]);
  });

  const values = { setType: 'normal' as const, weightGrams: 60000, reps: 8, durationSeconds: null, distanceMeters: null, rpe: null, notes: null };

  async function withExercises() {
    const { db, userId } = await setup();
    const ids: Record<string, string> = {};
    for (const name of ['Squat', 'Row']) {
      ids[name] = crypto.randomUUID();
      await db.insert(exercises).values({ id: ids[name], source: 'custom', name, category: 'strength', loadType: 'external' });
    }
    return { db, userId, ids };
  }

  test('list ended workouts newest first, with exercises in order, their category and the number of sets', async () => {
    const { db, userId, ids } = await withExercises();
    const older = await startWorkout(db, userId, new Date('2026-10-01T10:00:00Z'));
    const row = await addWorkoutExercise(db, older.id, ids['Row']);
    await addSet(db, row, values);
    await endWorkout(db, older.id, new Date('2026-10-01T11:00:00Z'));

    const newer = await startWorkout(db, userId, new Date('2026-10-20T10:00:00Z'));
    const squat = await addWorkoutExercise(db, newer.id, ids['Squat']);
    await addWorkoutExercise(db, newer.id, ids['Row']);
    await addSet(db, squat, values);
    await addSet(db, squat, values);
    await endWorkout(db, newer.id, new Date('2026-10-20T10:45:00Z'));

    expect(await listWorkoutHistory(db, userId)).toEqual([
      {
        id: newer.id,
        startedAt: new Date('2026-10-20T10:00:00Z'),
        endedAt: new Date('2026-10-20T10:45:00Z'),
        exerciseNames: ['Squat', 'Row'],
        setCount: 2,
        exercises: [
          { name: 'Squat', category: 'strength', sets: 2 },
          { name: 'Row', category: 'strength', sets: 0 },
        ],
      },
      {
        id: older.id,
        startedAt: new Date('2026-10-01T10:00:00Z'),
        endedAt: new Date('2026-10-01T11:00:00Z'),
        exerciseNames: ['Row'],
        setCount: 1,
        exercises: [{ name: 'Row', category: 'strength', sets: 1 }],
      },
    ]);
  });

  test('leave out the active workout and deleted workouts, workout exercises and sets', async () => {
    const { db, userId, ids } = await withExercises();
    const kept = await startWorkout(db, userId, new Date('2026-10-01T10:00:00Z'));
    const squat = await addWorkoutExercise(db, kept.id, ids['Squat']);
    await addSet(db, squat, values);
    await deleteSet(db, await addSet(db, squat, values));
    await deleteWorkoutExercise(db, await addWorkoutExercise(db, kept.id, ids['Row']));
    await endWorkout(db, kept.id);

    const deleted = await startWorkout(db, userId, new Date('2026-10-02T10:00:00Z'));
    await endWorkout(db, deleted.id);
    await deleteWorkout(db, deleted.id);
    await startWorkout(db, userId);

    const history = await listWorkoutHistory(db, userId);
    expect(history.map((workout) => workout.id)).toEqual([kept.id]);
    expect(history[0]).toMatchObject({ exerciseNames: ['Squat'], setCount: 1 });
  });

  test('return an empty list without ended workouts', async () => {
    const { db, userId } = await setup();
    expect(await listWorkoutHistory(db, userId)).toEqual([]);
  });

  test('get one workout, and null when it was deleted', async () => {
    const { db, userId } = await setup();
    const workout = await startWorkout(db, userId);
    await endWorkout(db, workout.id);

    expect((await getWorkout(db, workout.id))?.id).toBe(workout.id);
    await deleteWorkout(db, workout.id);
    expect(await getWorkout(db, workout.id)).toBeNull();
    expect(await getWorkout(db, 'unknown')).toBeNull();
  });
});
