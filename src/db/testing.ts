// Test helpers: an in-memory database that behaves like the SQLite plugin.
import Database from 'better-sqlite3';
import { createDatabase, type SqlConnection } from './driver';
import { runMigrations } from './migrate';
import { migrations } from './migrations';

// better-sqlite3 returns rows as objects keyed by column name, like the plugin,
// so the bridge in driver.ts runs the same code path as on the phone.
export function createTestConnection(): SqlConnection {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  return {
    async query(statement, values = []) {
      return { values: sqlite.prepare(statement).all(...values) as Record<string, unknown>[] };
    },
    async run(statement, values = [], _transaction, returnMode) {
      const prepared = sqlite.prepare(statement);
      if (returnMode === 'all') {
        return { changes: { values: prepared.all(...values) as Record<string, unknown>[] } };
      }
      prepared.run(...values);
      return { changes: {} };
    },
  };
}

export async function createTestDatabase() {
  const conn = createTestConnection();
  await runMigrations(conn, migrations);
  return { conn, db: createDatabase(conn) };
}
