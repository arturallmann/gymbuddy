import { describe, expect, test } from 'vitest';
import { addBodyweight, deleteBodyweight, listBodyweights } from './bodyweights';
import { getLocalSettings } from './settings';
import { createTestDatabase } from '@/testing/database';

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  return { db, userId };
}

describe('bodyweights', () => {
  test('add bodyweights and list them oldest first; a new one keeps the older ones', async () => {
    const { db, userId } = await setup();
    await addBodyweight(db, userId, 85000, new Date('2026-11-10T08:00:00Z'));
    const first = await addBodyweight(db, userId, 80000, new Date('2026-11-01T08:00:00Z'));

    expect(first).toMatchObject({ userId, weightGrams: 80000, deletedAt: null });
    expect((await listBodyweights(db, userId)).map((b) => b.weightGrams)).toEqual([80000, 85000]);
  });

  test('leave deleted bodyweights out', async () => {
    const { db, userId } = await setup();
    const wrong = await addBodyweight(db, userId, 800000);
    await addBodyweight(db, userId, 80000);

    await deleteBodyweight(db, wrong.id);

    expect((await listBodyweights(db, userId)).map((b) => b.weightGrams)).toEqual([80000]);
  });

  test('keep two bodyweights saved at the same time', async () => {
    const { db, userId } = await setup();
    await Promise.all([addBodyweight(db, userId, 80000), addBodyweight(db, userId, 81000)]);

    expect(await listBodyweights(db, userId)).toHaveLength(2);
  });
});
