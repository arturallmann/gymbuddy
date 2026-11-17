// Queries for sets: logging, editing and removing them, and the last sets of an exercise.
import { and, asc, desc, eq, isNull, max, ne } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { sets, workoutExercises, workouts, type WorkoutSet } from './schema';
import type { SetValues } from '@/lib/sets';

const setsOf = (workoutExerciseId: string) =>
  and(eq(sets.workoutExerciseId, workoutExerciseId), isNull(sets.deletedAt));

// The sets of a workout exercise, in position order.
export async function listSets(db: AppDatabase, workoutExerciseId: string): Promise<WorkoutSet[]> {
  return db.select().from(sets).where(setsOf(workoutExerciseId)).orderBy(asc(sets.position));
}

// Logs a set after the last one. One transaction, so two sets at once get different positions.
export async function addSet(
  db: AppDatabase,
  workoutExerciseId: string,
  values: SetValues,
  completedAt: Date = new Date(),
): Promise<string> {
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    const [{ last }] = await tx.select({ last: max(sets.position).as('last') }).from(sets).where(setsOf(workoutExerciseId));
    await tx.insert(sets).values({ ...values, id, workoutExerciseId, position: (last ?? 0) + 1, completedAt });
  });
  return id;
}

// Writes changed values to a logged set. Position and completion time stay.
export async function updateSet(db: AppDatabase, id: string, values: SetValues) {
  await db
    .update(sets)
    .set(values)
    .where(and(eq(sets.id, id), isNull(sets.deletedAt)));
}

export async function deleteSet(db: AppDatabase, id: string, deletedAt: Date = new Date()) {
  await db
    .update(sets)
    .set({ deletedAt })
    .where(and(eq(sets.id, id), isNull(sets.deletedAt)));
}

// The sets of this exercise in the newest other workout that has any, in order.
// The set form prefills from them and shows them as "Last time".
export async function getLastSets(db: AppDatabase, exerciseId: string, workoutId: string): Promise<WorkoutSet[]> {
  const found = and(
    eq(workoutExercises.exerciseId, exerciseId),
    ne(workouts.id, workoutId),
    isNull(workouts.deletedAt),
    isNull(workoutExercises.deletedAt),
    isNull(sets.deletedAt),
  );
  const [last] = await db
    .select({ id: workouts.id })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(found)
    .orderBy(desc(workouts.startedAt))
    .limit(1);
  if (!last) {
    return [];
  }
  const rows = await db
    .select({ set: sets })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(found, eq(workouts.id, last.id)))
    .orderBy(asc(workoutExercises.position), asc(sets.position));
  return rows.map((row) => row.set);
}
