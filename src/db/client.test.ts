import { count } from 'drizzle-orm';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createFakePlugin } from '@/testing/plugin';
import { exercises, muscleGroups } from './schema';

const fake = vi.hoisted(() => ({ plugin: null as ReturnType<typeof createFakePlugin> | null }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android' } }));
vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  SQLiteConnection: vi.fn(function () {
    return fake.plugin!.sqlite;
  }),
}));

// client.ts keeps the open database in module state, so each test loads a fresh copy.
async function loadClient() {
  vi.resetModules();
  return import('./client');
}

beforeEach(() => {
  fake.plugin = createFakePlugin();
});

describe('getDatabase', () => {
  test('open the database, run migrations and seed the library', async () => {
    const { getDatabase } = await loadClient();
    const db = await getDatabase();

    expect(fake.plugin!.sqlite.createConnection).toHaveBeenCalledWith(
      'gymbuddy',
      false,
      'no-encryption',
      1,
      false,
    );
    expect(fake.plugin!.dbConnection.open).toHaveBeenCalled();
    expect(fake.plugin!.dbConnection.execute).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;', false);
    expect((await db.select({ n: count() }).from(exercises))[0].n).toBeGreaterThan(800);
    expect((await db.select({ n: count() }).from(muscleGroups))[0].n).toBe(17);
  });

  test('open the database only once', async () => {
    const { getDatabase } = await loadClient();
    const [first, second] = await Promise.all([getDatabase(), getDatabase()]);

    expect(second).toBe(first);
    expect(fake.plugin!.sqlite.createConnection).toHaveBeenCalledTimes(1);
  });

  test('try again on the next call after a failure', async () => {
    const { getDatabase } = await loadClient();
    fake.plugin!.dbConnection.open.mockRejectedValueOnce(new Error('locked'));

    await expect(getDatabase()).rejects.toThrow('locked');
    await expect(getDatabase()).resolves.toBeDefined();
  });

  test('reuse a connection that still exists after a reload', async () => {
    fake.plugin!.sqlite.connections.add('gymbuddy');
    const { getDatabase } = await loadClient();
    await getDatabase();

    expect(fake.plugin!.sqlite.retrieveConnection).toHaveBeenCalledWith('gymbuddy', false);
    expect(fake.plugin!.sqlite.createConnection).not.toHaveBeenCalled();
  });

  test('skip the web store on the phone', async () => {
    const { getDatabase } = await loadClient();
    await getDatabase();

    expect(fake.plugin!.sqlite.initWebStore).not.toHaveBeenCalled();
    expect(fake.plugin!.sqlite.saveToStore).not.toHaveBeenCalled();
  });
});
