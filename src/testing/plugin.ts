// A fake of the SQLite plugin's SQLiteConnection, backed by better-sqlite3.
// Used to test src/db/client.ts without a phone.
import { vi } from 'vitest';
import { createTestConnection } from './database';

export function createFakePlugin() {
  const conn = createTestConnection();
  const dbConnection = {
    ...conn,
    open: vi.fn(async () => {}),
    execute: vi.fn(async (statements: string) => {
      await conn.run(statements);
    }),
  };
  const sqlite = {
    connections: new Set<string>(),
    initWebStore: vi.fn(async () => {}),
    saveToStore: vi.fn(async () => {}),
    checkConnectionsConsistency: vi.fn(async () => ({ result: true })),
    isConnection: vi.fn(async (name: string) => ({ result: sqlite.connections.has(name) })),
    retrieveConnection: vi.fn(async () => dbConnection),
    createConnection: vi.fn(async (name: string) => {
      sqlite.connections.add(name);
      return dbConnection;
    }),
  };
  return { sqlite, dbConnection };
}
