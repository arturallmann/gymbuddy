import { count, eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import library from '../../data/free-exercise-db/exercises.json';
import { readAppState, writeAppState } from './appState';
import { exerciseImages, exerciseMuscleGroups, exercises, muscleGroups } from './schema';
import {
  muscleGroupName,
  seedLibrary,
  libraryVersion,
  seedLibraryIfChanged,
  toLibraryExercise,
  type SourceExercise,
} from './seed';
import { createTestDatabase } from '@/testing/database';

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
    await seedLibraryIfChanged(db);
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
    await seedLibraryIfChanged(db);

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

describe('seedLibraryIfChanged', () => {
  async function nameOf(db: Awaited<ReturnType<typeof createTestDatabase>>['db'], sourceId: string) {
    const [row] = await db.select({ name: exercises.name }).from(exercises).where(eq(exercises.sourceId, sourceId));
    return row.name;
  }

  test('build the version from the commit and the seed version', () => {
    expect(libraryVersion('abc')).toBe('abc:1');
  });

  test('write the library version after the first seed', async () => {
    const { db } = await createTestDatabase();
    await seedLibraryIfChanged(db, 'a:1');

    expect(await readAppState(db, 'libraryVersion')).toBe('a:1');
  });

  test('skip the seed when the library version is the same', async () => {
    const { db } = await createTestDatabase();
    await seedLibraryIfChanged(db, 'a:1');
    await db.update(exercises).set({ name: 'Renamed' }).where(eq(exercises.sourceId, source[0].id));

    await seedLibraryIfChanged(db, 'a:1');

    expect(await nameOf(db, source[0].id)).toBe('Renamed');
  });

  test('seed again after an app update with a new library version', async () => {
    const { db } = await createTestDatabase();
    await seedLibraryIfChanged(db, 'a:1');
    await db.update(exercises).set({ name: 'Renamed' }).where(eq(exercises.sourceId, source[0].id));

    await seedLibraryIfChanged(db, 'b:1');

    expect(await nameOf(db, source[0].id)).toBe(source[0].name);
    expect(await readAppState(db, 'libraryVersion')).toBe('b:1');
  });

  test('seed a phone that has the library but no library version yet', async () => {
    const { db } = await createTestDatabase();
    await seedLibrary(db, source);
    await db.update(exercises).set({ name: 'Renamed' }).where(eq(exercises.sourceId, source[0].id));

    await seedLibraryIfChanged(db, 'a:1');

    expect(await nameOf(db, source[0].id)).toBe(source[0].name);
  });

  test('keep custom exercises when it seeds again', async () => {
    const { db } = await createTestDatabase();
    await writeAppState(db, 'libraryVersion', 'old:1');
    await db
      .insert(exercises)
      .values({ source: 'custom', name: 'My exercise', category: 'strength', loadType: 'external' });

    await seedLibraryIfChanged(db, 'new:1');

    const custom = await db.select().from(exercises).where(eq(exercises.source, 'custom'));
    expect(custom.map((row) => row.name)).toEqual(['My exercise']);
  });
});
