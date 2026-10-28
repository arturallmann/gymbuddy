import type { SqlConnection } from './driver';
import type { Migration } from './migrations';

// Same table that Drizzle's own migrators use.
const MIGRATIONS_TABLE = '__drizzle_migrations';

// Runs every migration newer than the last one recorded, in one transaction.
export async function runMigrations(conn: SqlConnection, migrations: Migration[]) {
  await conn.run(
    `CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (id INTEGER PRIMARY KEY, hash TEXT NOT NULL, created_at NUMERIC)`,
    [],
    false,
  );
  const last = await conn.query(
    `SELECT created_at FROM "${MIGRATIONS_TABLE}" ORDER BY created_at DESC LIMIT 1`,
  );
  const lastWhen = Number(last.values?.[0]?.created_at ?? -1);
  const pending = migrations.filter((migration) => migration.when > lastWhen);
  if (pending.length === 0) {
    return;
  }

  await conn.beginTransaction();
  try {
    for (const migration of pending) {
      for (const statement of migration.statements) {
        await conn.run(statement, [], false);
      }
      await conn.run(
        `INSERT INTO "${MIGRATIONS_TABLE}" (hash, created_at) VALUES (?, ?)`,
        [migration.hash, migration.when],
        false,
      );
    }
    await conn.commitTransaction();
  } catch (error) {
    await conn.rollbackTransaction();
    throw error;
  }
}
