import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { sets, workoutExercises, workoutGroups, workouts, type Workout } from './schema';

const active = (userId: string) =>
  and(eq(workouts.userId, userId), isNull(workouts.endedAt), isNull(workouts.deletedAt));

// The workout the user has started and not ended yet, or null.
export async function getActiveWorkout(db: AppDatabase, userId: string): Promise<Workout | null> {
  const [workout] = await db.select().from(workouts).where(active(userId)).limit(1);
  return workout ?? null;
}

// Starts a workout, or returns the active one if it exists (decision 019).
// The unique index on active workouts makes two starts at once create one row.
export async function startWorkout(
  db: AppDatabase,
  userId: string,
  startedAt: Date = new Date(),
): Promise<Workout> {
  await db.insert(workouts).values({ userId, startedAt }).onConflictDoNothing();
  const workout = await getActiveWorkout(db, userId);
  if (!workout) {
    throw new Error('The workout could not start');
  }
  return workout;
}

// Writes the end time. A workout that has ended already keeps its first end time.
export async function endWorkout(db: AppDatabase, id: string, endedAt: Date = new Date()): Promise<Workout> {
  const notDeleted = and(eq(workouts.id, id), isNull(workouts.deletedAt));
  await db
    .update(workouts)
    .set({ endedAt })
    .where(and(notDeleted, isNull(workouts.endedAt)));
  const [workout] = await db.select().from(workouts).where(notDeleted);
  if (!workout) {
    throw new Error(`Workout ${id} not found`);
  }
  return workout;
}

// Deletes the workout with its workout exercises, sets and exercise groups, in one transaction.
export async function discardWorkout(db: AppDatabase, id: string, deletedAt: Date = new Date()) {
  await db.transaction(async (tx) => {
    const exerciseIds = tx
      .select({ id: workoutExercises.id })
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, id));
    await tx
      .update(sets)
      .set({ deletedAt })
      .where(and(inArray(sets.workoutExerciseId, exerciseIds), isNull(sets.deletedAt)));
    await tx
      .update(workoutExercises)
      .set({ deletedAt })
      .where(and(eq(workoutExercises.workoutId, id), isNull(workoutExercises.deletedAt)));
    await tx
      .update(workoutGroups)
      .set({ deletedAt })
      .where(and(eq(workoutGroups.workoutId, id), isNull(workoutGroups.deletedAt)));
    await tx
      .update(workouts)
      .set({ deletedAt })
      .where(and(eq(workouts.id, id), isNull(workouts.deletedAt)));
  });
}
