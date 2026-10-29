import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { searchExercises } from './exercises';
import { exercises, users } from './schema';
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
