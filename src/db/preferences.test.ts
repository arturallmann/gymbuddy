import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { getExercisePreferences, listExercisePreferences, saveExercisePreferences } from './preferences';
import { exercisePreferences, exercises } from './schema';
import { getLocalSettings } from './settings';
import { createTestDatabase } from '@/testing/database';

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const ids: string[] = [];
  for (const name of ['Leg Press', 'Squat']) {
    const id = crypto.randomUUID();
    await db.insert(exercises).values({ id, source: 'custom', name, category: 'strength', loadType: 'external' });
    ids.push(id);
  }
  return { db, userId, ids };
}

describe('exercise preferences', () => {
  test('return null before anything is saved', async () => {
    const { db, userId, ids } = await setup();
    expect(await getExercisePreferences(db, userId, ids[0])).toBeNull();
  });

  test('save notes and a unit override, and keep values a later change leaves out', async () => {
    const { db, userId, ids } = await setup();
    await saveExercisePreferences(db, userId, ids[0], { notes: ' Seat at 4. ', weightUnit: 'lb' });
    const saved = await saveExercisePreferences(db, userId, ids[0], { distanceUnit: 'imperial' });

    expect(saved).toMatchObject({ notes: 'Seat at 4.', weightUnit: 'lb', distanceUnit: 'imperial' });
    expect(await db.select().from(exercisePreferences)).toHaveLength(1);
  });

  test('clear the notes and the unit override', async () => {
    const { db, userId, ids } = await setup();
    await saveExercisePreferences(db, userId, ids[0], { notes: 'Seat at 4.', weightUnit: 'lb' });

    const saved = await saveExercisePreferences(db, userId, ids[0], { notes: '   ', weightUnit: null });

    expect(saved).toMatchObject({ notes: null, weightUnit: null });
  });

  test('create one row when two saves run at once', async () => {
    const { db, userId, ids } = await setup();
    await Promise.all([
      saveExercisePreferences(db, userId, ids[0], { weightUnit: 'lb' }),
      saveExercisePreferences(db, userId, ids[0], { notes: 'Seat at 4.' }),
    ]);

    expect(await db.select().from(exercisePreferences)).toHaveLength(1);
    expect(await getExercisePreferences(db, userId, ids[0])).toMatchObject({ weightUnit: 'lb', notes: 'Seat at 4.' });
  });

  test('ignore a deleted row, and start a new one after it', async () => {
    const { db, userId, ids } = await setup();
    await saveExercisePreferences(db, userId, ids[0], { weightUnit: 'lb' });
    await db.update(exercisePreferences).set({ deletedAt: new Date() }).where(eq(exercisePreferences.exerciseId, ids[0]));

    expect(await getExercisePreferences(db, userId, ids[0])).toBeNull();
    const saved = await saveExercisePreferences(db, userId, ids[0], { notes: 'New machine' });
    expect(saved).toMatchObject({ notes: 'New machine', weightUnit: null });
    expect(await db.select().from(exercisePreferences)).toHaveLength(2);
  });

  test('list the preferences of several exercises', async () => {
    const { db, userId, ids } = await setup();
    await saveExercisePreferences(db, userId, ids[0], { weightUnit: 'lb' });

    const map = await listExercisePreferences(db, userId, ids);
    expect([...map.keys()]).toEqual([ids[0]]);
    expect(map.get(ids[0])?.weightUnit).toBe('lb');
    expect(await listExercisePreferences(db, userId, [])).toEqual(new Map());
  });
});
