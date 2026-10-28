import { count, eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import library from '../../data/free-exercise-db/exercises.json';
import { exerciseImages, exerciseMuscleGroups, exercises, muscleGroups } from './schema';
import {
  muscleGroupName,
  seedLibrary,
  seedLibraryIfEmpty,
  toLibraryExercise,
  type SourceExercise,
} from './seed';
import { createTestDatabase } from './testing';

const source = library as SourceExercise[];

function find(name: string) {
  const exercise = source.find((item) => item.name === name);
  if (!exercise) throw new Error(`${name} is not in the library`);
  return toLibraryExercise(exercise);
}

describe('toLibraryExercise', () => {
  test('map a barbell exercise to external weight and reps', () => {
    expect(find('Barbell Curl')).toMatchObject({
      category: 'strength',
      loadType: 'external',
      tracksReps: true,
      tracksDuration: false,
    });
  });

  test('map a body-only exercise to bodyweight', () => {
    expect(find('Pullups')).toMatchObject({ loadType: 'bodyweight', tracksReps: true });
  });

  test('map a static hold to duration', () => {
    expect(find('Plank')).toMatchObject({
      loadType: 'bodyweight',
      tracksReps: false,
      tracksDuration: true,
    });
  });

  test('map a stretch to no weight and a default duration', () => {
    const stretch = toLibraryExercise(source.find((item) => item.category === 'stretching')!);
    expect(stretch).toMatchObject({
      category: 'stretch',
      loadType: 'none',
      tracksReps: false,
      tracksDuration: true,
      defaultDurationSeconds: 30,
    });
  });

  test('map cardio to duration and distance', () => {
    const cardio = toLibraryExercise(source.find((item) => item.category === 'cardio')!);
    expect(cardio).toMatchObject({ category: 'cardio', tracksDuration: true, tracksDistance: true });
  });

  test('keep a muscle group that is primary and secondary only as primary', () => {
    const exercise = toLibraryExercise({
      ...source[0],
      primaryMuscles: ['biceps'],
      secondaryMuscles: ['biceps', 'forearms'],
    });
    expect(exercise.muscleGroups).toEqual([
      { key: 'biceps', role: 'primary' },
      { key: 'forearms', role: 'secondary' },
    ]);
  });

  test('capitalize muscle group names', () => {
    expect(muscleGroupName('lower back')).toBe('Lower back');
  });
});

describe('seedLibrary', () => {
  async function counts(db: Awaited<ReturnType<typeof createTestDatabase>>['db']) {
    const [[e], [g], [l], [i]] = await Promise.all([
      db.select({ n: count() }).from(exercises),
      db.select({ n: count() }).from(muscleGroups),
      db.select({ n: count() }).from(exerciseMuscleGroups),
      db.select({ n: count() }).from(exerciseImages),
    ]);
    return { exercises: e.n, muscleGroups: g.n, links: l.n, images: i.n };
  }

  test('seed every exercise, muscle group and image', async () => {
    const { db } = await createTestDatabase();
    await seedLibraryIfEmpty(db);
    const result = await counts(db);

    expect(result.exercises).toBe(source.length);
    expect(result.muscleGroups).toBe(17);
    expect(result.images).toBe(source.reduce((sum, item) => sum + item.images.length, 0));
    expect(result.links).toBeGreaterThan(source.length);
  });

  test('add no rows when it runs again, and keep custom exercises', async () => {
    const { db } = await createTestDatabase();
    await seedLibrary(db, source);
    await db
      .insert(exercises)
      .values({ source: 'custom', name: 'My exercise', category: 'strength', loadType: 'external' });
    const before = await counts(db);

    await seedLibrary(db, source);
    await seedLibraryIfEmpty(db);

    expect(await counts(db)).toEqual(before);
    const custom = await db.select().from(exercises).where(eq(exercises.source, 'custom'));
    expect(custom.map((row) => row.name)).toEqual(['My exercise']);
  });

  test('update a changed library exercise in place', async () => {
    const { db } = await createTestDatabase();
    await seedLibrary(db, source);
    const [before] = await db.select().from(exercises).where(eq(exercises.sourceId, source[0].id));

    await seedLibrary(db, [{ ...source[0], name: 'Renamed' }]);
    const [after] = await db.select().from(exercises).where(eq(exercises.sourceId, source[0].id));

    expect(after.id).toBe(before.id);
    expect(after.name).toBe('Renamed');
  });
});
