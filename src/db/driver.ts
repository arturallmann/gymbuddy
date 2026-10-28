import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';

type Row = Record<string, unknown>;

// The part of the plugin's SQLiteDBConnection that the app uses.
// Tests replace it with a better-sqlite3 version (see testing.ts).
export type SqlConnection = {
  query(statement: string, values?: unknown[]): Promise<{ values?: Row[] }>;
  run(
    statement: string,
    values?: unknown[],
    transaction?: boolean,
    returnMode?: string,
  ): Promise<{ changes?: { values?: Row[] } }>;
  beginTransaction(): Promise<unknown>;
  commitTransaction(): Promise<unknown>;
  rollbackTransaction(): Promise<unknown>;
};

type Method = 'run' | 'all' | 'values' | 'get';

const SELECT = /^\s*(select|with)\b/i;
// Drizzle's transaction statements. Savepoints run as plain statements.
const BEGIN = /^\s*begin\b/i;
const COMMIT = /^\s*commit\s*$/i;
const ROLLBACK = /^\s*rollback\s*$/i;

// The plugin returns rows as objects keyed by column name, but Drizzle needs
// arrays in column order. Two columns with the same name (such as the ids of
// joined tables) would overwrite each other, so SELECT statements run as a
// subquery: SQLite then names duplicate columns "id", "id:1" and so on.
async function execute(conn: SqlConnection, sql: string, params: unknown[], method: Method) {
  if (method === 'run') {
    // The plugin must know about transactions: its web version saves to
    // IndexedDB after each write outside a transaction, which ends a raw BEGIN.
    if (BEGIN.test(sql)) {
      await conn.beginTransaction();
    } else if (COMMIT.test(sql)) {
      await conn.commitTransaction();
    } else if (ROLLBACK.test(sql)) {
      await conn.rollbackTransaction();
    } else {
      // transaction = false: the plugin must not wrap each statement in its own transaction.
      await conn.run(sql, params, false);
    }
    return { rows: [] };
  }
  let rows: Row[];
  if (SELECT.test(sql)) {
    rows = (await conn.query(`select * from (${sql})`, params)).values ?? [];
  } else {
    // INSERT, UPDATE or DELETE with RETURNING.
    rows = (await conn.run(sql, params, false, 'all')).changes?.values ?? [];
  }
  const arrays = rows.map((row) => Object.values(row));
  return { rows: method === 'get' ? arrays[0] : arrays };
}

export function createDatabase(conn: SqlConnection) {
  return drizzle(
    (sql, params, method) => execute(conn, sql, params, method),
    async (queries) => {
      await conn.beginTransaction();
      try {
        const results = [];
        for (const query of queries) {
          results.push(await execute(conn, query.sql, query.params, query.method));
        }
        await conn.commitTransaction();
        return results;
      } catch (error) {
        await conn.rollbackTransaction();
        throw error;
      }
    },
    { schema },
  );
}

export type AppDatabase = ReturnType<typeof createDatabase>;
