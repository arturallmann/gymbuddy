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
};

type Method = 'run' | 'all' | 'values' | 'get';

const SELECT = /^\s*(select|with)\b/i;

// The plugin returns rows as objects keyed by column name, but Drizzle needs
// arrays in column order. Two columns with the same name (such as the ids of
// joined tables) would overwrite each other, so SELECT statements run as a
// subquery: SQLite then names duplicate columns "id", "id:1" and so on.
async function execute(conn: SqlConnection, sql: string, params: unknown[], method: Method) {
  if (method === 'run') {
    // transaction = false: Drizzle sends its own BEGIN and COMMIT.
    await conn.run(sql, params, false);
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
      await conn.run('BEGIN', [], false);
      try {
        const results = [];
        for (const query of queries) {
          results.push(await execute(conn, query.sql, query.params, query.method));
        }
        await conn.run('COMMIT', [], false);
        return results;
      } catch (error) {
        await conn.run('ROLLBACK', [], false);
        throw error;
      }
    },
    { schema },
  );
}

export type AppDatabase = ReturnType<typeof createDatabase>;
