// Queries for workouts: start, end, delete, the active workout and the workout history.
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lt } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { exercises, sets, workoutExercises, workoutGroups, workouts, type Category, type Workout } from './schema';

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
// "Delete workout" on a past workout uses it.
export async function deleteWorkout(db: AppDatabase, id: string, deletedAt: Date = new Date()) {
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

// A workout as the workout history lists it.
export type WorkoutHistoryItem = Pick<Workout, 'id' | 'startedAt' | 'endedAt'> & {
  exerciseNames: string[];
  setCount: number;
  // The workout exercises in order, with their category and number of sets (for the calendar).
  exercises: { name: string; category: Category; sets: number }[];
};

// Ended workouts of the user, newest first, with their exercise names and number of sets.
// With `startedIn`, only workouts that started in that time span (from included, to not),
// such as today for the home page.
export async function listWorkoutHistory(
  db: AppDatabase,
  userId: string,
  startedIn?: { from: Date; to: Date },
): Promise<WorkoutHistoryItem[]> {
  const ended = await db
    .select({ id: workouts.id, startedAt: workouts.startedAt, endedAt: workouts.endedAt })
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        isNotNull(workouts.endedAt),
        isNull(workouts.deletedAt),
        startedIn ? gte(workouts.startedAt, startedIn.from) : undefined,
        startedIn ? lt(workouts.startedAt, startedIn.to) : undefined,
      ),
    )
    .orderBy(desc(workouts.startedAt));
  if (ended.length === 0) {
    return [];
  }
  const ids = ended.map((workout) => workout.id);
  const names = await db
    .select({
      id: workoutExercises.id,
      workoutId: workoutExercises.workoutId,
      name: exercises.name,
      category: exercises.category,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(and(inArray(workoutExercises.workoutId, ids), isNull(workoutExercises.deletedAt)))
    .orderBy(asc(workoutExercises.position));
  const counts = await db
    .select({ workoutExerciseId: sets.workoutExerciseId, sets: count(sets.id).as('setCount') })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .where(and(inArray(workoutExercises.workoutId, ids), isNull(workoutExercises.deletedAt), isNull(sets.deletedAt)))
    .groupBy(sets.workoutExerciseId);
  const setCounts = new Map(counts.map((row) => [row.workoutExerciseId, row.sets]));
  return ended.map((workout) => {
    const items = names
      .filter((row) => row.workoutId === workout.id)
      .map((row) => ({ name: row.name, category: row.category, sets: setCounts.get(row.id) ?? 0 }));
    return {
      ...workout,
      exerciseNames: items.map((item) => item.name),
      setCount: items.reduce((sum, item) => sum + item.sets, 0),
      exercises: items,
    };
  });
}

// One workout, or null when it does not exist or was deleted.
export async function getWorkout(db: AppDatabase, id: string): Promise<Workout | null> {
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), isNull(workouts.deletedAt)));
  return workout ?? null;
}
