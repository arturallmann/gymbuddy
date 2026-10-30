import { and, asc, count, desc, eq, inArray, isNotNull, isNull, max, ne } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import {
  exercises,
  sets,
  workoutExercises,
  workoutGroups,
  workouts,
  type Exercise,
  type Phase,
  type Workout,
  type WorkoutSet,
} from './schema';
import { moveBlock } from '@/lib/blocks';
import type { SetValues } from '@/lib/sets';

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
// "Discard workout" uses it for the active workout, "Delete workout" for a past one.
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

// One exercise inside one workout, as the workout page lists it.
export type WorkoutExerciseItem = {
  id: string;
  exerciseId: string;
  name: string;
  position: number;
  phase: Phase;
  // The exercise group this workout exercise belongs to, or null.
  groupId: string | null;
} & Pick<Exercise, 'loadType' | 'tracksReps' | 'tracksDuration' | 'tracksDistance' | 'category' | 'defaultDurationSeconds'>;

const notDeletedIn = (workoutId: string) =>
  and(eq(workoutExercises.workoutId, workoutId), isNull(workoutExercises.deletedAt));

const itemColumns = {
  id: workoutExercises.id,
  exerciseId: workoutExercises.exerciseId,
  name: exercises.name,
  position: workoutExercises.position,
  loadType: exercises.loadType,
  tracksReps: exercises.tracksReps,
  tracksDuration: exercises.tracksDuration,
  tracksDistance: exercises.tracksDistance,
  category: exercises.category,
  defaultDurationSeconds: exercises.defaultDurationSeconds,
  phase: workoutExercises.phase,
  groupId: workoutExercises.groupId,
};

// The workout exercises of a workout, in position order.
export async function listWorkoutExercises(db: AppDatabase, workoutId: string): Promise<WorkoutExerciseItem[]> {
  return db
    .select(itemColumns)
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(notDeletedIn(workoutId))
    .orderBy(asc(workoutExercises.position));
}

// One workout exercise with its workout id, or null when it does not exist or was deleted.
export async function getWorkoutExercise(
  db: AppDatabase,
  id: string,
): Promise<(WorkoutExerciseItem & { workoutId: string }) | null> {
  const [item] = await db
    .select({ ...itemColumns, workoutId: workoutExercises.workoutId })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(eq(workoutExercises.id, id), isNull(workoutExercises.deletedAt), isNull(workouts.deletedAt)));
  return item ?? null;
}

// Adds an exercise at the end of the workout, in the given phase. One transaction,
// so two adds at once still get different positions.
export async function addWorkoutExercise(
  db: AppDatabase,
  workoutId: string,
  exerciseId: string,
  phase: Phase = 'main',
): Promise<string> {
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    const [{ last }] = await tx
      .select({ last: max(workoutExercises.position).as('last') })
      .from(workoutExercises)
      .where(notDeletedIn(workoutId));
    await tx.insert(workoutExercises).values({ id, workoutId, exerciseId, phase, position: (last ?? 0) + 1 });
  });
  return id;
}

// Moves the workout exercise one block up or down inside its phase. A block is one workout
// exercise or a whole exercise group, so group members stay together. Does nothing at the
// top or bottom of the phase.
export async function moveWorkoutExercise(db: AppDatabase, id: string, direction: 'up' | 'down') {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ workoutId: workoutExercises.workoutId, phase: workoutExercises.phase })
      .from(workoutExercises)
      .where(and(eq(workoutExercises.id, id), isNull(workoutExercises.deletedAt)));
    if (!row) {
      throw new Error(`Workout exercise ${id} not found`);
    }
    const list = await tx
      .select({ id: workoutExercises.id, position: workoutExercises.position, groupId: workoutExercises.groupId })
      .from(workoutExercises)
      .where(and(notDeletedIn(row.workoutId), eq(workoutExercises.phase, row.phase)))
      .orderBy(asc(workoutExercises.position));
    // The phase keeps its positions; only who holds which position changes.
    const positions = list.map((item) => item.position);
    const order = moveBlock(list, id, direction);
    for (const [index, itemId] of order.entries()) {
      if (list[index].id !== itemId) {
        await tx.update(workoutExercises).set({ position: positions[index] }).where(eq(workoutExercises.id, itemId));
      }
    }
  });
}

// Moves a workout exercise to another phase. Its position stays, so it keeps its
// order among the exercises of the new phase. A group member takes its whole group along.
export async function changeWorkoutExercisePhase(db: AppDatabase, id: string, phase: Phase) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ groupId: workoutExercises.groupId })
      .from(workoutExercises)
      .where(and(eq(workoutExercises.id, id), isNull(workoutExercises.deletedAt)));
    if (!row) return;
    await tx
      .update(workoutExercises)
      .set({ phase })
      .where(
        and(
          row.groupId ? eq(workoutExercises.groupId, row.groupId) : eq(workoutExercises.id, id),
          isNull(workoutExercises.deletedAt),
        ),
      );
  });
}

// Deletes the workout exercise and its sets, in one transaction. A group left with one
// member is no group any more, so that member becomes a single workout exercise again.
export async function deleteWorkoutExercise(db: AppDatabase, id: string, deletedAt: Date = new Date()) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ groupId: workoutExercises.groupId })
      .from(workoutExercises)
      .where(and(eq(workoutExercises.id, id), isNull(workoutExercises.deletedAt)));
    await tx
      .update(sets)
      .set({ deletedAt })
      .where(and(eq(sets.workoutExerciseId, id), isNull(sets.deletedAt)));
    await tx
      .update(workoutExercises)
      .set({ deletedAt })
      .where(and(eq(workoutExercises.id, id), isNull(workoutExercises.deletedAt)));
    if (row?.groupId) {
      const left = await tx
        .select({ id: workoutExercises.id })
        .from(workoutExercises)
        .where(and(eq(workoutExercises.groupId, row.groupId), isNull(workoutExercises.deletedAt)));
      if (left.length < 2) {
        await tx.update(workoutExercises).set({ groupId: null }).where(eq(workoutExercises.groupId, row.groupId));
        await tx.update(workoutGroups).set({ deletedAt }).where(eq(workoutGroups.id, row.groupId));
      }
    }
  });
}

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

// A workout as the workout history lists it.
export type WorkoutHistoryItem = Pick<Workout, 'id' | 'startedAt' | 'endedAt'> & {
  exerciseNames: string[];
  setCount: number;
};

// Ended workouts of the user, newest first, with their exercise names and number of sets.
export async function listWorkoutHistory(db: AppDatabase, userId: string): Promise<WorkoutHistoryItem[]> {
  const ended = await db
    .select({ id: workouts.id, startedAt: workouts.startedAt, endedAt: workouts.endedAt })
    .from(workouts)
    .where(and(eq(workouts.userId, userId), isNotNull(workouts.endedAt), isNull(workouts.deletedAt)))
    .orderBy(desc(workouts.startedAt));
  if (ended.length === 0) {
    return [];
  }
  const ids = ended.map((workout) => workout.id);
  const names = await db
    .select({ workoutId: workoutExercises.workoutId, name: exercises.name })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(and(inArray(workoutExercises.workoutId, ids), isNull(workoutExercises.deletedAt)))
    .orderBy(asc(workoutExercises.position));
  const counts = await db
    .select({ workoutId: workoutExercises.workoutId, sets: count(sets.id).as('setCount') })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .where(and(inArray(workoutExercises.workoutId, ids), isNull(workoutExercises.deletedAt), isNull(sets.deletedAt)))
    .groupBy(workoutExercises.workoutId);
  const setCounts = new Map(counts.map((row) => [row.workoutId, row.sets]));
  return ended.map((workout) => ({
    ...workout,
    exerciseNames: names.filter((row) => row.workoutId === workout.id).map((row) => row.name),
    setCount: setCounts.get(workout.id) ?? 0,
  }));
}

// One workout, or null when it does not exist or was deleted.
export async function getWorkout(db: AppDatabase, id: string): Promise<Workout | null> {
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), isNull(workouts.deletedAt)));
  return workout ?? null;
}
