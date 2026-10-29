import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { exercises, sets, workoutExercises, workoutGroups, workouts } from './schema';
import { getLocalSettings } from './settings';
import { discardWorkout, endWorkout, getActiveWorkout, startWorkout } from './workouts';
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
