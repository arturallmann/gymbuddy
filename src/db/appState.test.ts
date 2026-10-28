import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { readAppState, writeAppState } from './appState';
import { appState } from './schema';
import { createTestDatabase } from '@/testing/database';

describe('app state', () => {
  test('return null before the first write', async () => {
    const { db } = await createTestDatabase();
    expect(await readAppState(db, 'libraryVersion')).toBeNull();
  });

  test('return the last written value', async () => {
    const { db } = await createTestDatabase();
    await writeAppState(db, 'libraryVersion', 'a:1');
    await writeAppState(db, 'libraryVersion', 'b:1');

    expect(await readAppState(db, 'libraryVersion')).toBe('b:1');
    expect(await db.select().from(appState)).toHaveLength(1);
  });

  test('ignore a deleted row, and bring it back on the next write', async () => {
    const { db } = await createTestDatabase();
    await writeAppState(db, 'libraryVersion', 'a:1');
    await db.update(appState).set({ deletedAt: new Date() }).where(eq(appState.key, 'libraryVersion'));

    expect(await readAppState(db, 'libraryVersion')).toBeNull();

    await writeAppState(db, 'libraryVersion', 'b:1');
    expect(await readAppState(db, 'libraryVersion')).toBe('b:1');
  });

  test('create one row when two writes run at once', async () => {
    const { db } = await createTestDatabase();
    await Promise.all([writeAppState(db, 'libraryVersion', 'a:1'), writeAppState(db, 'libraryVersion', 'b:1')]);

    expect(await db.select().from(appState)).toHaveLength(1);
  });
});
