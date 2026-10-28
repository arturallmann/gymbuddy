import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';

type Row = Record<string, unknown>;

// The part of the plugin's SQLiteDBConnection that the app uses.
// Tests replace it with a better-sqlite3 version (see testing.ts).
export type SqlConnection = {
  query(statement: string, values?: unknown[]): Promise<{ values?: Row[] }>;
  run(statement: string, values?: unknown[], transaction?: boolean): Promise<unknown>;
  beginTransaction(): Promise<unknown>;
  commitTransaction(): Promise<unknown>;
  rollbackTransaction(): Promise<unknown>;
};

type Method = 'run' | 'all' | 'values' | 'get';

const SELECT = /^\s*(select|with)\b/i;
const RETURNING = /^\s*(insert|update|delete|replace)\b[\s\S]*\breturning\b/i;
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
  if (RETURNING.test(sql)) {
    // The plugin's Android version fakes RETURNING and returns wrong or no rows.
    throw new Error(
      'RETURNING is not supported by the SQLite plugin. Write the row with an id from crypto.randomUUID(), then select it by id.',
    );
  }
  // SELECT runs as a subquery; other statements, such as PRAGMA, run as they are.
  const statement = SELECT.test(sql) ? `select * from (${sql})` : sql;
  const rows: Row[] = (await conn.query(statement, params)).values ?? [];
  const arrays = rows.map((row) => Object.values(row));
  return { rows: method === 'get' ? arrays[0] : arrays };
}

// Runs tasks one after the other, in the order they were queued.
function createQueue() {
  let last: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const result = last.then(task, task);
    last = result.catch(() => undefined);
    return result;
  };
}

export function createDatabase(conn: SqlConnection) {
  // The app has one connection. Two transactions on it at the same time would
  // nest BEGIN statements, so transactions and batches wait for each other.
  // Inside a transaction, use `tx` (not `db`) for nested transactions.
  const queue = createQueue();

  const db = drizzle(
    (sql, params, method) => execute(conn, sql, params, method),
    (queries) =>
      queue(async () => {
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
      }),
    { schema },
  );

  const transaction = db.transaction.bind(db);
  db.transaction = ((run, config) => queue(() => transaction(run, config))) as typeof db.transaction;
  return db;
}

export type AppDatabase = ReturnType<typeof createDatabase>;
