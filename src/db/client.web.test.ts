// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from 'vitest';
import { createFakePlugin } from '@/testing/plugin';
import { users } from './schema';

const fake = vi.hoisted(() => ({ plugin: null as ReturnType<typeof createFakePlugin> | null }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));
vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  SQLiteConnection: vi.fn(function () {
    return fake.plugin!.sqlite;
  }),
}));
// The real loader registers jeep-sqlite; a plain element is enough here.
vi.mock('jeep-sqlite/loader', () => ({
  defineCustomElements: vi.fn(async () => {
    if (!customElements.get('jeep-sqlite')) {
      customElements.define('jeep-sqlite', class extends HTMLElement {});
    }
  }),
}));

beforeEach(() => {
  fake.plugin = createFakePlugin();
  vi.resetModules();
});

test('set up the browser store with the copied .wasm file', async () => {
  const { getDatabase } = await import('./client');
  await getDatabase();

  const element = document.querySelector('jeep-sqlite');
  expect(element).toHaveProperty('tagName', 'JEEP-SQLITE');
  expect(element?.getAttribute('wasmpath')).toBe('/assets');
  expect(element?.getAttribute('autosave')).toBe('true');
  expect(fake.plugin!.sqlite.initWebStore).toHaveBeenCalled();
});

test('save to IndexedDB after each commit', async () => {
  const { getDatabase } = await import('./client');
  const db = await getDatabase();
  fake.plugin!.sqlite.saveToStore.mockClear();

  await db.transaction(async (tx) => {
    await tx.insert(users).values({});
  });

  expect(fake.plugin!.sqlite.saveToStore).toHaveBeenCalledWith('gymbuddy');
});
