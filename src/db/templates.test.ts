import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { getWorkoutGroup, makeSuperset } from './groups';
import { exercises, templateExercises, templates, users } from './schema';
import { getLocalSettings } from './settings';
import {
  addTemplateToWorkout,
  deleteTemplate,
  getTemplateTargets,
  listTemplates,
  renameTemplate,
  saveGroupAsTemplate,
} from './templates';
import { addSet, addWorkoutExercise, endWorkout, listWorkoutExercises, startWorkout } from './workouts';
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

describe('addTemplateToWorkout', () => {
  async function withTemplate() {
    const { db, userId, ids, groupId, first } = await setup();
    await addSet(db, ids[0], values);
    const templateId = await saveGroupAsTemplate(db, userId, groupId, 'Arms and core');
    await endWorkout(db, first.id);
    const workout = await startWorkout(db, userId);
    const squatId = crypto.randomUUID();
    await db.insert(exercises).values({ id: squatId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external' });
    await addWorkoutExercise(db, workout.id, squatId);
    return { db, userId, workout, templateId };
  }

  test('copy the exercises after the last workout exercise, as a new group that remembers the template', async () => {
    const { db, workout, templateId } = await withTemplate();

    await addTemplateToWorkout(db, workout.id, templateId);

    const items = await listWorkoutExercises(db, workout.id);
    expect(items.map((item) => [item.name, item.position, item.phase])).toEqual([
      ['Squat', 1, 'main'],
      ['Curl', 2, 'warmup'],
      ['Plank', 3, 'warmup'],
    ]);
    expect(items[1].groupId).not.toBeNull();
    expect(items[2].groupId).toBe(items[1].groupId);
    const group = await getWorkoutGroup(db, items[1].groupId!);
    expect(group?.group).toMatchObject({ groupType: 'superset', restSeconds: 75, templateId, workoutId: workout.id });
  });

  test('give each copy its own group when the template is added twice', async () => {
    const { db, workout, templateId } = await withTemplate();
    await addTemplateToWorkout(db, workout.id, templateId);
    await addTemplateToWorkout(db, workout.id, templateId);

    const groupIds = (await listWorkoutExercises(db, workout.id)).map((item) => item.groupId).filter(Boolean);
    expect(new Set(groupIds).size).toBe(2);
  });

  test('keep the workout as it was when the template changes or is deleted afterwards', async () => {
    const { db, userId, workout, templateId } = await withTemplate();
    await addTemplateToWorkout(db, workout.id, templateId);
    const before = await listWorkoutExercises(db, workout.id);

    await renameTemplate(db, userId, templateId, 'Changed');
    await db.update(templateExercises).set({ phase: 'cooldown', restSeconds: 10 }).where(eq(templateExercises.templateId, templateId));
    await deleteTemplate(db, userId, templateId);

    expect(await listWorkoutExercises(db, workout.id)).toEqual(before);
    expect((await getWorkoutGroup(db, before[1].groupId!))?.group.restSeconds).toBe(75);
  });
});

describe('getTemplateTargets', () => {
  test('return the targets of a workout exercise that came from a saved superset', async () => {
    const { db, userId, ids, groupId, first } = await setup();
    await addSet(db, ids[0], { ...values, weightGrams: 22500, reps: 8 });
    const templateId = await saveGroupAsTemplate(db, userId, groupId, 'Arms');
    await endWorkout(db, first.id);
    const workout = await startWorkout(db, userId);
    const [curl, plank] = await addTemplateToWorkout(db, workout.id, templateId);

    expect(await getTemplateTargets(db, curl)).toMatchObject({ targetSets: 1, targetWeightGrams: 22500, targetReps: 8 });
    expect(await getTemplateTargets(db, plank)).toMatchObject({ targetSets: null, targetReps: null });
  });

  test('return null for a workout exercise added by hand', async () => {
    const { db, ids } = await setup();
    expect(await getTemplateTargets(db, ids[0])).toBeNull();
  });
});
