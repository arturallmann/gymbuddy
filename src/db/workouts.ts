import { and, asc, eq, inArray, isNull, max } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { exercises, sets, workoutExercises, workoutGroups, workouts, type Workout } from './schema';

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

// One exercise inside one workout, as the workout page lists it.
export type WorkoutExerciseItem = {
  id: string;
  exerciseId: string;
  name: string;
  position: number;
};

const notDeletedIn = (workoutId: string) =>
  and(eq(workoutExercises.workoutId, workoutId), isNull(workoutExercises.deletedAt));

// The workout exercises of a workout, in position order.
export async function listWorkoutExercises(db: AppDatabase, workoutId: string): Promise<WorkoutExerciseItem[]> {
  return db
    .select({
      id: workoutExercises.id,
      exerciseId: workoutExercises.exerciseId,
      name: exercises.name,
      position: workoutExercises.position,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(notDeletedIn(workoutId))
    .orderBy(asc(workoutExercises.position));
}

// Adds an exercise at the end of the workout. One transaction, so two adds at
// once still get different positions.
export async function addWorkoutExercise(db: AppDatabase, workoutId: string, exerciseId: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    const [{ last }] = await tx
      .select({ last: max(workoutExercises.position) })
      .from(workoutExercises)
      .where(notDeletedIn(workoutId));
    await tx.insert(workoutExercises).values({ id, workoutId, exerciseId, position: (last ?? 0) + 1 });
  });
  return id;
}

// Swaps the workout exercise with its neighbour above or below.
// Does nothing at the top or bottom of the list.
export async function moveWorkoutExercise(db: AppDatabase, id: string, direction: 'up' | 'down') {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ workoutId: workoutExercises.workoutId })
      .from(workoutExercises)
      .where(and(eq(workoutExercises.id, id), isNull(workoutExercises.deletedAt)));
    if (!row) {
      throw new Error(`Workout exercise ${id} not found`);
    }
    const list = await tx
      .select({ id: workoutExercises.id, position: workoutExercises.position })
      .from(workoutExercises)
      .where(notDeletedIn(row.workoutId))
      .orderBy(asc(workoutExercises.position));
    const index = list.findIndex((item) => item.id === id);
    const other = list[direction === 'up' ? index - 1 : index + 1];
    if (!other) {
      return;
    }
    const current = list[index];
    await tx.update(workoutExercises).set({ position: other.position }).where(eq(workoutExercises.id, current.id));
    await tx.update(workoutExercises).set({ position: current.position }).where(eq(workoutExercises.id, other.id));
  });
}

// Deletes the workout exercise and its sets, in one transaction.
export async function deleteWorkoutExercise(db: AppDatabase, id: string, deletedAt: Date = new Date()) {
  await db.transaction(async (tx) => {
    await tx
      .update(sets)
      .set({ deletedAt })
      .where(and(eq(sets.workoutExerciseId, id), isNull(sets.deletedAt)));
    await tx
      .update(workoutExercises)
      .set({ deletedAt })
      .where(and(eq(workoutExercises.id, id), isNull(workoutExercises.deletedAt)));
  });
}
