import { count } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { userSettings, users } from './schema';
import { getLocalSettings, updateSettings } from './settings';
import { createTestDatabase } from './testing';

describe('settings', () => {
  test('create one local user with default settings on first start', async () => {
    const { db } = await createTestDatabase();
    const first = await getLocalSettings(db);
    const second = await getLocalSettings(db);

    expect(second.id).toBe(first.id);
    expect(first).toMatchObject({ weightUnit: 'kg', distanceUnit: 'metric', preset: 'standard' });
    expect((await db.select({ n: count() }).from(users))[0].n).toBe(1);
    expect((await db.select({ n: count() }).from(userSettings))[0].n).toBe(1);
  });

  test('create only one user when called twice at the same time', async () => {
    const { db } = await createTestDatabase();
    const [first, second] = await Promise.all([getLocalSettings(db), getLocalSettings(db)]);

    expect(second.id).toBe(first.id);
    expect((await db.select({ n: count() }).from(users))[0].n).toBe(1);
  });

  test('save changes and keep other fields', async () => {
    const { db } = await createTestDatabase();
    const settings = await getLocalSettings(db);
    const updated = await updateSettings(db, settings.id, {
      weightUnit: 'lb',
      preset: 'custom',
      features: { rpe: true },
    });

    expect(updated).toMatchObject({
      weightUnit: 'lb',
      distanceUnit: 'metric',
      preset: 'custom',
      features: { rpe: true },
    });
    expect(await getLocalSettings(db)).toEqual(updated);
  });

  test('fail for unknown settings', async () => {
    const { db } = await createTestDatabase();
    await expect(updateSettings(db, 'missing', { weightUnit: 'lb' })).rejects.toThrow('not found');
  });
});
