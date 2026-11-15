import { and, eq, isNull, sql } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { appState } from './schema';

// libraryVersion: the bundled library seeded last (decision 018). onlineLibraryCommit: the free-exercise-db
// commit the online library update applied, '' for none. libraryCheckedAt: milliseconds of the last
// online check (decision 038).
export const APP_STATE_KEYS = ['libraryVersion', 'onlineLibraryCommit', 'libraryCheckedAt'] as const;
export type AppStateKey = (typeof APP_STATE_KEYS)[number];

// The stored value, or null when the app has not written it yet.
export async function readAppState(db: AppDatabase, key: AppStateKey): Promise<string | null> {
  const [row] = await db
    .select({ value: appState.value })
    .from(appState)
    .where(and(eq(appState.key, key), isNull(appState.deletedAt)))
    .limit(1);
  return row?.value ?? null;
}

// Writes the value in one statement, so two calls at once never create two rows.
export async function writeAppState(db: AppDatabase, key: AppStateKey, value: string) {
  await db
    .insert(appState)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appState.key,
      set: { value: sql`excluded.value`, updatedAt: sql`excluded.updatedAt`, deletedAt: null },
    });
}
