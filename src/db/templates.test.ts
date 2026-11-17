import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { makeSuperset } from './groups';
import { exercises, templateExercises, templates, users, workoutGroups } from './schema';
import { getLocalSettings } from './settings';
import {
  deleteTemplate,
  findSavedSuperset,
  listTemplates,
  renameTemplate,
  saveGroupAsTemplate,
  updateSavedSuperset,
} from './templates';
import { addTemplateToWorkout } from './templateWorkouts';
import { addSet } from './sets';
import { addWorkoutExercise } from './workoutExercises';
import { endWorkout, startWorkout } from './workouts';
import { createTestDatabase } from '@/testing/database';

const values = { setType: 'normal' as const, weightGrams: 20000, reps: 10, durationSeconds: null, distanceMeters: null, rpe: null, notes: null };

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const workout = await startWorkout(db, userId);
  const ids: string[] = [];
  for (const name of ['Curl', 'Plank']) {
    const id = crypto.randomUUID();
    await db.insert(exercises).values({ id, name, userId, source: 'custom', category: 'strength', loadType: name === 'Plank' ? 'bodyweight' : 'external' });
    ids.push(await addWorkoutExercise(db, workout.id, id, 'warmup'));
  }
  const groupId = await makeSuperset(db, workout.id, ids, 75);
  return { db, userId, ids, groupId, first: workout };
}

describe('saveGroupAsTemplate', () => {
  test('save the exercises in order with phase, rest and targets from the logged sets', async () => {
    const { db, userId, ids, groupId } = await setup();
    await addSet(db, ids[0], values);
    await addSet(db, ids[0], { ...values, weightGrams: 22500, reps: 8 });
    await addSet(db, ids[1], { ...values, weightGrams: null, reps: null, durationSeconds: 60 });

    await saveGroupAsTemplate(db, userId, groupId, '  Arms and core ');

    const [saved] = await listTemplates(db, userId, 'superset');
    expect(saved.name).toBe('Arms and core');
    expect(saved.exercises.map((item) => [item.name, item.position, item.phase, item.groupKey, item.groupType, item.restSeconds])).toEqual([
      ['Curl', 1, 'warmup', '1', 'superset', 75],
      ['Plank', 2, 'warmup', '1', 'superset', 75],
    ]);
    expect(saved.exercises[0]).toMatchObject({ targetSets: 2, targetWeightGrams: 22500, targetReps: 8, targetDurationSeconds: null });
    expect(saved.exercises[1]).toMatchObject({ targetSets: 1, targetWeightGrams: null, targetDurationSeconds: 60 });
  });

  test('save no targets for exercises without sets', async () => {
    const { db, userId, groupId } = await setup();
    await saveGroupAsTemplate(db, userId, groupId, 'Empty');

    const [saved] = await listTemplates(db, userId, 'superset');
    expect(saved.exercises.every((item) => item.targetSets === null && item.targetReps === null)).toBe(true);
  });
});

describe('listTemplates', () => {
  test('list the user’s saved supersets newest first, without routines, deleted ones or other users’ templates', async () => {
    const { db, userId, groupId } = await setup();
    await saveGroupAsTemplate(db, userId, groupId, 'First');
    await new Promise((resolve) => setTimeout(resolve, 5));
    await saveGroupAsTemplate(db, userId, groupId, 'Second');
    const gone = await saveGroupAsTemplate(db, userId, groupId, 'Gone');
    await deleteTemplate(db, userId, gone);
    await db.insert(templates).values({ userId, kind: 'routine', name: 'Push day' });
    const otherId = crypto.randomUUID();
    await db.insert(users).values({ id: otherId });
    await db.insert(templates).values({ userId: otherId, kind: 'superset', name: 'Theirs' });

    expect((await listTemplates(db, userId, 'superset')).map((item) => item.name)).toEqual(['Second', 'First']);
  });
});

describe('renameTemplate and deleteTemplate', () => {
  test('rename a saved superset', async () => {
    const { db, userId, groupId } = await setup();
    const id = await saveGroupAsTemplate(db, userId, groupId, 'Old');
    await renameTemplate(db, userId, id, ' New ');
    expect((await listTemplates(db, userId, 'superset'))[0].name).toBe('New');
  });

  test('delete a saved superset with its exercises, but not another user’s', async () => {
    const { db, userId, groupId } = await setup();
    const id = await saveGroupAsTemplate(db, userId, groupId, 'Mine');
    const otherId = crypto.randomUUID();
    await db.insert(users).values({ id: otherId });

    await deleteTemplate(db, otherId, id);
    expect(await listTemplates(db, userId, 'superset')).toHaveLength(1);

    await deleteTemplate(db, userId, id);
    expect(await listTemplates(db, userId, 'superset')).toEqual([]);
    const rows = await db.select().from(templateExercises);
    expect(rows.every((row) => row.deletedAt !== null)).toBe(true);
  });
});

// 5.2.2 (decision 051): "Save superset" changes the saved superset a group came from, or one with the same
// exercises in the same order, instead of saving a second one.
describe('findSavedSuperset and updateSavedSuperset', () => {
  test('find nothing before a saved superset exists', async () => {
    const { db, userId, groupId } = await setup();
    expect(await findSavedSuperset(db, userId, groupId)).toBeNull();
    expect(await findSavedSuperset(db, userId, 'unknown')).toBeNull();
  });

  test('find a saved superset with the same exercises in the same order, not in another order', async () => {
    const { db, userId, groupId } = await setup();
    const id = await saveGroupAsTemplate(db, userId, groupId, 'Arms');
    expect(await findSavedSuperset(db, userId, groupId)).toEqual({ id, name: 'Arms' });

    // Swap the order of the saved rows: Plank first.
    const rows = await db.select().from(templateExercises);
    for (const row of rows) await db.update(templateExercises).set({ position: 3 - row.position }).where(eq(templateExercises.id, row.id));
    expect(await findSavedSuperset(db, userId, groupId)).toBeNull();
  });

  test('find the saved superset a group was added from, even after its exercises changed', async () => {
    const { db, userId, groupId, first } = await setup();
    const id = await saveGroupAsTemplate(db, userId, groupId, 'Arms');
    await endWorkout(db, first.id);
    const second = await startWorkout(db, userId);
    await addTemplateToWorkout(db, second.id, id);
    const [group] = await db.select().from(workoutGroups).where(eq(workoutGroups.workoutId, second.id));
    // The saved superset changes afterwards (another order), so only its origin still matches.
    const rows = await db.select().from(templateExercises);
    for (const row of rows) await db.update(templateExercises).set({ position: 3 - row.position }).where(eq(templateExercises.id, row.id));

    expect(await findSavedSuperset(db, userId, group.id)).toEqual({ id, name: 'Arms' });
  });

  test('ignore deleted saved supersets and those of another user', async () => {
    const { db, userId, groupId } = await setup();
    const gone = await saveGroupAsTemplate(db, userId, groupId, 'Gone');
    await deleteTemplate(db, userId, gone);
    const otherId = crypto.randomUUID();
    await db.insert(users).values({ id: otherId });
    const theirs = crypto.randomUUID();
    await db.insert(templates).values({ id: theirs, userId: otherId, kind: 'superset', name: 'Theirs' });

    expect(await findSavedSuperset(db, userId, groupId)).toBeNull();
    await expect(updateSavedSuperset(db, userId, theirs, groupId)).rejects.toThrow('not found');
    await expect(updateSavedSuperset(db, userId, gone, groupId)).rejects.toThrow('not found');
  });

  test('change the exercises, rest and targets, keep the name, and delete the old rows', async () => {
    const { db, userId, ids, groupId } = await setup();
    const id = await saveGroupAsTemplate(db, userId, groupId, 'Arms');
    await addSet(db, ids[0], values);
    await addSet(db, ids[0], { ...values, weightGrams: 25000, reps: 6 });
    await db.update(workoutGroups).set({ restSeconds: 120 }).where(eq(workoutGroups.id, groupId));

    await updateSavedSuperset(db, userId, id, groupId);

    const saved = await listTemplates(db, userId, 'superset');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ id, name: 'Arms' });
    expect(saved[0].exercises.map((item) => [item.name, item.position, item.restSeconds])).toEqual([
      ['Curl', 1, 120],
      ['Plank', 2, 120],
    ]);
    expect(saved[0].exercises[0]).toMatchObject({ targetSets: 2, targetWeightGrams: 25000, targetReps: 6 });
    const all = await db.select().from(templateExercises).where(eq(templateExercises.templateId, id));
    expect(all.filter((row) => row.deletedAt !== null)).toHaveLength(2);
  });

  test('leave one set of rows when two updates run at once', async () => {
    const { db, userId, groupId } = await setup();
    const id = await saveGroupAsTemplate(db, userId, groupId, 'Arms');

    await Promise.all([updateSavedSuperset(db, userId, id, groupId), updateSavedSuperset(db, userId, id, groupId)]);

    const [saved] = await listTemplates(db, userId, 'superset');
    expect(saved.exercises.map((item) => item.name)).toEqual(['Curl', 'Plank']);
  });
});
