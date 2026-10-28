import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { createDatabase, type AppDatabase, type SqlConnection } from './driver';
import { runMigrations } from './migrate';
import { migrations } from './migrations';
import { seedLibraryIfEmpty } from './seed';

const DATABASE_NAME = 'gymbuddy';

let opening: Promise<AppDatabase> | null = null;

// Opens the database once per app start. Later calls get the same instance.
export function getDatabase(): Promise<AppDatabase> {
  if (!opening) {
    opening = openDatabase().catch((error) => {
      opening = null;
      throw error;
    });
  }
  return opening;
}

async function openDatabase(): Promise<AppDatabase> {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const isWeb = Capacitor.getPlatform() === 'web';
  if (isWeb) {
    await initWebStore(sqlite);
  }

  // After a reload in the dev server the native connection can still exist.
  const consistent = (await sqlite.checkConnectionsConsistency()).result;
  const exists = (await sqlite.isConnection(DATABASE_NAME, false)).result;
  const conn =
    consistent && exists
      ? await sqlite.retrieveConnection(DATABASE_NAME, false)
      : await sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', 1, false);
  await conn.open();
  await conn.execute('PRAGMA foreign_keys = ON;', false);

  // The web version saves to IndexedDB after each write outside a transaction,
  // but not after a commit. Save after each commit, too.
  const connection: SqlConnection = isWeb
    ? {
        query: (statement, values) => conn.query(statement, values),
        run: (statement, values, transaction, returnMode) =>
          conn.run(statement, values, transaction, returnMode),
        beginTransaction: () => conn.beginTransaction(),
        rollbackTransaction: () => conn.rollbackTransaction(),
        commitTransaction: async () => {
          await conn.commitTransaction();
          await sqlite.saveToStore(DATABASE_NAME);
        },
      }
    : conn;

  await runMigrations(connection, migrations);
  const db = createDatabase(connection);
  await seedLibraryIfEmpty(db);
  return db;
}

// The browser has no native SQLite. The plugin's web version runs SQLite as
// WebAssembly (jeep-sqlite) and stores the database in IndexedDB.
async function initWebStore(sqlite: SQLiteConnection) {
  const { defineCustomElements } = await import('jeep-sqlite/loader');
  await defineCustomElements(window);
  if (!document.querySelector('jeep-sqlite')) {
    const element = document.createElement('jeep-sqlite');
    element.setAttribute('autosave', 'true');
    // scripts/copy-sql-wasm.mjs copies the file here before `npm run dev`.
    element.setAttribute('wasmpath', '/assets');
    document.body.appendChild(element);
  }
  await customElements.whenDefined('jeep-sqlite');
  await sqlite.initWebStore();
}
