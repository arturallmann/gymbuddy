import { and, asc, eq, isNull, or, sql } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { exercises, type Exercise } from './schema';

const SEARCH_LIMIT = 50;

// "50%_curl" matches the text as typed, not as a LIKE pattern.
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Library exercises and the user's custom exercises whose name contains `query`,
// sorted by name. An empty query returns the first exercises by name.
export async function searchExercises(
  db: AppDatabase,
  userId: string,
  query: string,
): Promise<Exercise[]> {
  const text = query.trim();
  return db
    .select()
    .from(exercises)
    .where(
      and(
        isNull(exercises.deletedAt),
        or(isNull(exercises.userId), eq(exercises.userId, userId)),
        text ? sql`${exercises.name} LIKE ${`%${escapeLike(text)}%`} ESCAPE '\\'` : undefined,
      ),
    )
    .orderBy(asc(exercises.name))
    .limit(SEARCH_LIMIT);
}
