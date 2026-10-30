import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { exercisePreferences, type ExercisePreferences } from './schema';

// What the user can change in their exercise preferences. Null clears a value:
// no notes, or no unit override (the settings apply).
export type ExercisePreferencesChange = Partial<Pick<ExercisePreferences, 'notes' | 'weightUnit' | 'distanceUnit'>>;

const ofUser = (userId: string) => and(eq(exercisePreferences.userId, userId), isNull(exercisePreferences.deletedAt));

// The user's preferences for one exercise, or null when they have none.
export async function getExercisePreferences(
  db: AppDatabase,
  userId: string,
  exerciseId: string,
): Promise<ExercisePreferences | null> {
  const [row] = await db
    .select()
    .from(exercisePreferences)
    .where(and(ofUser(userId), eq(exercisePreferences.exerciseId, exerciseId)));
  return row ?? null;
}

// The user's preferences for several exercises, keyed by exercise id.
export async function listExercisePreferences(
  db: AppDatabase,
  userId: string,
  exerciseIds: string[],
): Promise<Map<string, ExercisePreferences>> {
  if (exerciseIds.length === 0) {
    return new Map();
  }
  const rows = await db
    .select()
    .from(exercisePreferences)
    .where(and(ofUser(userId), inArray(exercisePreferences.exerciseId, exerciseIds)));
  return new Map(rows.map((row) => [row.exerciseId, row]));
}

// Writes the change in one statement, so two saves at once never create two rows.
// Values that the change leaves out stay as they are.
export async function saveExercisePreferences(
  db: AppDatabase,
  userId: string,
  exerciseId: string,
  change: ExercisePreferencesChange,
): Promise<ExercisePreferences> {
  const notes = change.notes === undefined ? undefined : change.notes?.trim() || null;
  const values = { ...change, ...(notes === undefined ? {} : { notes }) };
  await db
    .insert(exercisePreferences)
    .values({ userId, exerciseId, ...values })
    .onConflictDoUpdate({
      target: [exercisePreferences.userId, exercisePreferences.exerciseId],
      targetWhere: sql`"deletedAt" IS NULL`,
      set: { ...values, updatedAt: new Date() },
    });
  const saved = await getExercisePreferences(db, userId, exerciseId);
  if (!saved) {
    throw new Error('The exercise preferences could not be saved');
  }
  return saved;
}
