import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import {
  addExercisePhoto,
  createCustomExercise,
  deleteExercisePhoto,
  deleteCustomExercise,
  updateCustomExercise,
} from './customExercises';
import { getExerciseDetail, listEquipment, searchExercises } from './exercises';
import { exerciseImages, exerciseMuscleGroups, exercises, muscleGroups, users } from './schema';
import { getLocalSettings } from './settings';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';

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

describe('photos of custom exercises', () => {
  async function withCustom() {
    const { db, userId } = await setup();
    const id = await createCustomExercise(db, userId, {
      name: 'Cable Thing',
      category: 'strength',
      equipment: 'cable',
      loadType: 'external',
      tracksReps: true,
      tracksDuration: false,
      tracksDistance: false,
      primaryMuscleGroupIds: [],
      secondaryMuscleGroupIds: [],
    });
    return { db, userId, id };
  }

  test('add photos in order and show the first one in lists', async () => {
    const { db, userId, id } = await withCustom();

    await addExercisePhoto(db, userId, id, 'exercise-photos/a.jpg');
    await addExercisePhoto(db, userId, id, 'exercise-photos/b.jpg');

    const detail = await getExerciseDetail(db, userId, id);
    expect(detail?.images.map((image) => [image.path, image.storedFile])).toEqual([
      ['exercise-photos/a.jpg', 'exercise-photos/a.jpg'],
      ['exercise-photos/b.jpg', 'exercise-photos/b.jpg'],
    ]);
    const [found] = await searchExercises(db, userId, 'Cable Thing');
    expect(found.imageStoredFile).toBe('exercise-photos/a.jpg');
  });

  test('delete a photo; the next one becomes the first, and a new photo goes last', async () => {
    const { db, userId, id } = await withCustom();
    const first = await addExercisePhoto(db, userId, id, 'exercise-photos/a.jpg');
    await addExercisePhoto(db, userId, id, 'exercise-photos/b.jpg');

    await deleteExercisePhoto(db, userId, first!);
    await addExercisePhoto(db, userId, id, 'exercise-photos/c.jpg');

    const detail = await getExerciseDetail(db, userId, id);
    expect(detail?.images.map((image) => image.storedFile)).toEqual(['exercise-photos/b.jpg', 'exercise-photos/c.jpg']);
    const [found] = await searchExercises(db, userId, 'Cable Thing');
    expect(found.imageStoredFile).toBe('exercise-photos/b.jpg');
    const [row] = await db.select().from(exerciseImages).where(eq(exerciseImages.id, first!));
    expect(row.deletedAt).not.toBeNull();
  });

  test('add or delete photos only on the user’s own custom exercises', async () => {
    const { db, userId, id } = await withCustom();
    await addTestLibrary(db);
    const [library] = await searchExercises(db, userId, 'Barbell Curl');
    const other = crypto.randomUUID();
    await db.insert(users).values({ id: other });

    expect(await addExercisePhoto(db, userId, library.id, 'exercise-photos/x.jpg')).toBeNull();
    expect(await addExercisePhoto(db, other, id, 'exercise-photos/x.jpg')).toBeNull();
    const libraryImage = (await getExerciseDetail(db, userId, library.id))!.images[0];
    await deleteExercisePhoto(db, userId, libraryImage.id);
    const photo = await addExercisePhoto(db, userId, id, 'exercise-photos/a.jpg');
    await deleteExercisePhoto(db, other, photo!);

    expect((await getExerciseDetail(db, userId, library.id))!.images).toHaveLength(2);
    expect((await getExerciseDetail(db, userId, id))!.images).toHaveLength(1);
  });

  test('two photos at once get different positions', async () => {
    const { db, userId, id } = await withCustom();

    await Promise.all([
      addExercisePhoto(db, userId, id, 'exercise-photos/a.jpg'),
      addExercisePhoto(db, userId, id, 'exercise-photos/b.jpg'),
    ]);

    const rows = await db.select().from(exerciseImages).where(eq(exerciseImages.exerciseId, id));
    expect(rows.map((row) => row.position).sort()).toEqual([1, 2]);
  });
});
