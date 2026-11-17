// Queries for workout exercises: adding, moving, phases and removing them.
import { and, asc, eq, isNull, max } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import {
  exercises,
  sets,
  workoutExercises,
  workoutGroups,
  workouts,
  type Exercise,
  type Phase,
} from './schema';
import { moveBlock, moveBlockTo } from '@/lib/blocks';
import type { SetValues } from '@/lib/sets';

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

// Adds an exercise to the end of the workout together with its first set, in one transaction.
// An exercise opened from the "Add exercise" page joins the workout only when its first set is
// logged (decision 031), so the workout never gets a workout exercise without sets this way.
export async function addWorkoutExerciseWithSet(
  db: AppDatabase,
  workoutId: string,
  exerciseId: string,
  phase: Phase,
  values: SetValues,
  completedAt: Date = new Date(),
): Promise<string> {
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    const [{ last }] = await tx
      .select({ last: max(workoutExercises.position).as('last') })
      .from(workoutExercises)
      .where(notDeletedIn(workoutId));
    await tx.insert(workoutExercises).values({ id, workoutId, exerciseId, phase, position: (last ?? 0) + 1 });
    await tx.insert(sets).values({ ...values, id: crypto.randomUUID(), workoutExerciseId: id, position: 1, completedAt });
  });
  return id;
}

type PhaseItem = { id: string; position: number; groupId: string | null };

// Gives the workout exercises of one phase a new order, in one transaction. `reorder` gets the
// phase in position order and returns the new id order. The phase keeps its positions; only who
// holds which position changes.
async function reorderPhase(db: AppDatabase, id: string, reorder: (list: PhaseItem[]) => string[]) {
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
    const positions = list.map((item) => item.position);
    const order = reorder(list);
    for (const [index, itemId] of order.entries()) {
      if (list[index].id !== itemId) {
        await tx.update(workoutExercises).set({ position: positions[index] }).where(eq(workoutExercises.id, itemId));
      }
    }
  });
}

// Moves the workout exercise one block up or down inside its phase. A block is one workout
// exercise or a whole exercise group, so group members stay together. Does nothing at the
// top or bottom of the phase.
export async function moveWorkoutExercise(db: AppDatabase, id: string, direction: 'up' | 'down') {
  await reorderPhase(db, id, (list) => moveBlock(list, id, direction));
}

// Moves the block of the workout exercise to block index `to` inside its phase (0 is the top),
// such as after a drag (4b.1). A group moves as a whole.
export async function moveWorkoutExerciseTo(db: AppDatabase, id: string, to: number) {
  await reorderPhase(db, id, (list) => moveBlockTo(list, id, to));
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
