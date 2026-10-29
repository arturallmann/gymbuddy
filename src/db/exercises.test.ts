import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import {
  createCustomExercise,
  deleteCustomExercise,
  getExerciseDetail,
  listEquipment,
  listMuscleGroups,
  searchExercises,
  updateCustomExercise,
} from './exercises';
import { exerciseImages, exerciseMuscleGroups, exercises, muscleGroups, users } from './schema';
import { getLocalSettings } from './settings';
import { createTestDatabase } from '@/testing/database';

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const add = (name: string, owner: string | null = null) =>
    db.insert(exercises).values({
      name,
      userId: owner,
      source: owner ? 'custom' : 'free-exercise-db',
      sourceId: owner ? null : name,
      category: 'strength',
      loadType: 'external',
    });
  return { db, userId, add };
}

describe('searchExercises', () => {
  test('find exercises by part of the name, in any case, sorted by name', async () => {
    const { db, userId, add } = await setup();
    await add('Barbell Curl');
    await add('Hammer Curl');
    await add('Bench Press');

    const found = await searchExercises(db, userId, '  curl ');

    expect(found.map((exercise) => exercise.name)).toEqual(['Barbell Curl', 'Hammer Curl']);
  });

  test('return exercises sorted by name for an empty search', async () => {
    const { db, userId, add } = await setup();
    await add('Squat');
    await add('Deadlift');

    expect((await searchExercises(db, userId, '')).map((exercise) => exercise.name)).toEqual(['Deadlift', 'Squat']);
  });

  test('include the user’s custom exercises, but not those of another user', async () => {
    const { db, userId, add } = await setup();
    const otherId = crypto.randomUUID();
    await db.insert(users).values({ id: otherId });
    await add('My Curl', userId);
    await add('Their Curl', otherId);

    expect((await searchExercises(db, userId, 'curl')).map((exercise) => exercise.name)).toEqual(['My Curl']);
  });

  test('leave out deleted exercises', async () => {
    const { db, userId, add } = await setup();
    await add('Old Curl');
    await db.update(exercises).set({ deletedAt: new Date() }).where(eq(exercises.name, 'Old Curl'));

    expect(await searchExercises(db, userId, 'curl')).toEqual([]);
  });

  test('match % and _ as typed', async () => {
    const { db, userId, add } = await setup();
    await add('Curl 50%');
    await add('Curl 500');
    await add('Curl_x');
    await add('Curlyx');

    expect((await searchExercises(db, userId, '50%')).map((exercise) => exercise.name)).toEqual(['Curl 50%']);
    expect((await searchExercises(db, userId, 'l_x')).map((exercise) => exercise.name)).toEqual(['Curl_x']);
  });
});

describe('muscle groups and images', () => {
  async function library() {
    const { db, userId, add } = await setup();
    const groups: Record<string, string> = {};
    for (const name of ['Biceps', 'Forearms', 'Chest']) {
      groups[name] = crypto.randomUUID();
      await db.insert(muscleGroups).values({ id: groups[name], key: name.toLowerCase(), name });
    }
    const ids: Record<string, string> = {};
    for (const name of ['Barbell Curl', 'Hammer Curl', 'Bench Press']) {
      await add(name);
      const [row] = await db.select().from(exercises).where(eq(exercises.name, name));
      ids[name] = row.id;
    }
    const link = (exercise: string, group: string, role: 'primary' | 'secondary') =>
      db.insert(exerciseMuscleGroups).values({ exerciseId: ids[exercise], muscleGroupId: groups[group], role });
    await link('Barbell Curl', 'Biceps', 'primary');
    await link('Barbell Curl', 'Forearms', 'secondary');
    await link('Hammer Curl', 'Forearms', 'primary');
    await link('Bench Press', 'Chest', 'primary');
    await db.insert(exerciseImages).values([
      { exerciseId: ids['Barbell Curl'], position: 2, path: 'Barbell_Curl/1.jpg' },
      { exerciseId: ids['Barbell Curl'], position: 1, path: 'Barbell_Curl/0.jpg' },
    ]);
    return { db, userId, groups, ids };
  }

  test('filter by a primary or secondary muscle group', async () => {
    const { db, userId, groups } = await library();

    const forearms = await searchExercises(db, userId, '', { muscleGroupId: groups['Forearms'] });
    expect(forearms.map((exercise) => exercise.name)).toEqual(['Barbell Curl', 'Hammer Curl']);
    const chest = await searchExercises(db, userId, 'curl', { muscleGroupId: groups['Chest'] });
    expect(chest).toEqual([]);
  });

  test('ignore deleted muscle group links when filtering', async () => {
    const { db, userId, groups, ids } = await library();
    await db
      .update(exerciseMuscleGroups)
      .set({ deletedAt: new Date() })
      .where(eq(exerciseMuscleGroups.exerciseId, ids['Hammer Curl']));

    const forearms = await searchExercises(db, userId, '', { muscleGroupId: groups['Forearms'] });
    expect(forearms.map((exercise) => exercise.name)).toEqual(['Barbell Curl']);
  });

  test('return the first image of each exercise, or null', async () => {
    const { db, userId } = await library();

    const found = await searchExercises(db, userId, 'curl');
    expect(found.map((exercise) => [exercise.name, exercise.imagePath])).toEqual([
      ['Barbell Curl', 'Barbell_Curl/0.jpg'],
      ['Hammer Curl', null],
    ]);
  });

  test('return at most `limit` exercises', async () => {
    const { db, userId } = await library();
    expect(await searchExercises(db, userId, '', { limit: 2 })).toHaveLength(2);
  });

  test('list muscle groups by name, without deleted ones', async () => {
    const { db, groups } = await library();
    await db.update(muscleGroups).set({ deletedAt: new Date() }).where(eq(muscleGroups.id, groups['Chest']));

    expect((await listMuscleGroups(db)).map((group) => group.name)).toEqual(['Biceps', 'Forearms']);
  });

  test('get one exercise with primary muscle groups first and images in order', async () => {
    const { db, userId, ids } = await library();

    expect(await getExerciseDetail(db, userId, ids['Barbell Curl'])).toMatchObject({
      exercise: { name: 'Barbell Curl' },
      muscleGroups: [
        { name: 'Biceps', role: 'primary' },
        { name: 'Forearms', role: 'secondary' },
      ],
      images: ['Barbell_Curl/0.jpg', 'Barbell_Curl/1.jpg'],
    });
  });

  test('return null for a deleted exercise, an unknown id or another user’s custom exercise', async () => {
    const { db, userId, add } = await setup();
    const otherId = crypto.randomUUID();
    await db.insert(users).values({ id: otherId });
    await add('Their Curl', otherId);
    await add('Old Curl');
    await db.update(exercises).set({ deletedAt: new Date() }).where(eq(exercises.name, 'Old Curl'));
    const rows = await db.select().from(exercises);

    for (const row of rows) {
      expect(await getExerciseDetail(db, userId, row.id)).toBeNull();
    }
    expect(await getExerciseDetail(db, userId, 'unknown')).toBeNull();
  });
});

describe('custom exercises', () => {
  async function withGroups() {
    const { db, userId } = await setup();
    const groups: Record<string, string> = {};
    for (const name of ['Biceps', 'Forearms', 'Lats']) {
      groups[name] = crypto.randomUUID();
      await db.insert(muscleGroups).values({ id: groups[name], key: name.toLowerCase(), name });
    }
    const input = {
      name: ' Band Curl ',
      category: 'strength' as const,
      equipment: ' bands ',
      loadType: 'none' as const,
      tracksReps: true,
      tracksDuration: false,
      tracksDistance: false,
      primaryMuscleGroupIds: [groups['Biceps']],
      secondaryMuscleGroupIds: [groups['Forearms']],
    };
    return { db, userId, groups, input };
  }

  test('create a custom exercise of the user with its muscle groups', async () => {
    const { db, userId, input } = await withGroups();
    const id = await createCustomExercise(db, userId, input);

    expect(await getExerciseDetail(db, userId, id)).toMatchObject({
      exercise: { name: 'Band Curl', equipment: 'bands', source: 'custom', userId, sourceId: null, loadType: 'none' },
      muscleGroups: [
        { name: 'Biceps', role: 'primary' },
        { name: 'Forearms', role: 'secondary' },
      ],
    });
    expect((await searchExercises(db, userId, 'band')).map((exercise) => exercise.id)).toEqual([id]);
  });

  test('count a muscle group in both lists as primary, and store empty equipment as null', async () => {
    const { db, userId, groups, input } = await withGroups();
    const id = await createCustomExercise(db, userId, {
      ...input,
      equipment: '  ',
      secondaryMuscleGroupIds: [groups['Biceps']],
    });

    const detail = await getExerciseDetail(db, userId, id);
    expect(detail?.exercise.equipment).toBeNull();
    expect(detail?.muscleGroups).toEqual([{ id: groups['Biceps'], name: 'Biceps', role: 'primary' }]);
  });

  test('change a custom exercise and its muscle groups, and bring back a removed muscle group', async () => {
    const { db, userId, groups, input } = await withGroups();
    const id = await createCustomExercise(db, userId, input);

    await updateCustomExercise(db, userId, id, {
      ...input,
      name: 'Band Row',
      primaryMuscleGroupIds: [groups['Lats']],
      secondaryMuscleGroupIds: [groups['Biceps']],
    });
    expect(await getExerciseDetail(db, userId, id)).toMatchObject({
      exercise: { name: 'Band Row' },
      muscleGroups: [
        { name: 'Lats', role: 'primary' },
        { name: 'Biceps', role: 'secondary' },
      ],
    });

    await updateCustomExercise(db, userId, id, { ...input, secondaryMuscleGroupIds: [groups['Forearms']] });
    expect((await getExerciseDetail(db, userId, id))?.muscleGroups.map((group) => group.name)).toEqual(['Biceps', 'Forearms']);
    const links = await db.select().from(exerciseMuscleGroups).where(eq(exerciseMuscleGroups.exerciseId, id));
    expect(links).toHaveLength(3);
  });

  test('remove all muscle groups', async () => {
    const { db, userId, input } = await withGroups();
    const id = await createCustomExercise(db, userId, input);

    await updateCustomExercise(db, userId, id, { ...input, primaryMuscleGroupIds: [], secondaryMuscleGroupIds: [] });

    expect((await getExerciseDetail(db, userId, id))?.muscleGroups).toEqual([]);
  });

  test('not change or delete a library exercise or another user’s exercise', async () => {
    const { db, userId, input } = await withGroups();
    const libraryId = crypto.randomUUID();
    await db.insert(exercises).values({ id: libraryId, source: 'free-exercise-db', sourceId: 'x', name: 'Squat', category: 'strength', loadType: 'external' });
    const otherId = crypto.randomUUID();
    await db.insert(users).values({ id: otherId });
    const theirs = await createCustomExercise(db, otherId, input);

    await expect(updateCustomExercise(db, userId, libraryId, input)).rejects.toThrow('not found');
    await expect(updateCustomExercise(db, userId, theirs, input)).rejects.toThrow('not found');
    await deleteCustomExercise(db, userId, libraryId);
    await deleteCustomExercise(db, userId, theirs);

    const rows = await db.select().from(exercises);
    expect(rows.every((row) => row.deletedAt === null)).toBe(true);
    expect(rows.find((row) => row.id === libraryId)?.name).toBe('Squat');
  });

  test('delete a custom exercise, so search no longer finds it', async () => {
    const { db, userId, input } = await withGroups();
    const id = await createCustomExercise(db, userId, input);

    await deleteCustomExercise(db, userId, id);

    expect(await searchExercises(db, userId, 'band')).toEqual([]);
    expect(await getExerciseDetail(db, userId, id)).toBeNull();
    await expect(updateCustomExercise(db, userId, id, input)).rejects.toThrow('not found');
  });

  test('list the equipment in use, sorted and without duplicates', async () => {
    const { db, userId, input } = await withGroups();
    await createCustomExercise(db, userId, input);
    await createCustomExercise(db, userId, { ...input, equipment: 'barbell' });
    await createCustomExercise(db, userId, { ...input, equipment: 'bands' });
    await createCustomExercise(db, userId, { ...input, equipment: null });

    expect(await listEquipment(db)).toEqual(['bands', 'barbell']);
  });
});
