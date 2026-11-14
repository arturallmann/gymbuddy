import { and, asc, countDistinct, eq, isNull, max } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { sets, workoutExercises, workouts, type Workout, type WorkoutExercise, type WorkoutSet } from './schema';

// One set of an exercise with the workout and workout exercise it belongs to.
export type HistoryRow = {
  workoutId: Workout['id'];
  startedAt: Workout['startedAt'];
  workoutExerciseId: WorkoutExercise['id'];
  workoutExerciseNotes: WorkoutExercise['notes'];
  set: WorkoutSet;
};

// Every set of one exercise in the user's workouts, oldest workout first, then by workout
// exercise and set position. The history view and the chart view both use this one query
// (docs/DATA_MODEL.md, charts and history).
export async function listExerciseHistory(db: AppDatabase, userId: string, exerciseId: string): Promise<HistoryRow[]> {
  return db
    .select({
      workoutId: workouts.id,
      startedAt: workouts.startedAt,
      workoutExerciseId: workoutExercises.id,
      workoutExerciseNotes: workoutExercises.notes,
      set: sets,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(
      and(
        eq(workouts.userId, userId),
        eq(workoutExercises.exerciseId, exerciseId),
        isNull(workouts.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(sets.deletedAt),
      ),
    )
    .orderBy(asc(workouts.startedAt), asc(workoutExercises.position), asc(sets.position));
}

// How often the user did an exercise: the number of workouts it is in, and when the newest of
// them started. Search results and muscle group lists put these exercises first (decision 037).
export type ExerciseUse = { workouts: number; lastAt: Date };

// The use of every exercise the user did, by exercise id. Active and ended workouts count;
// deleted workouts and deleted workout exercises do not.
export async function listExerciseUse(db: AppDatabase, userId: string): Promise<Map<string, ExerciseUse>> {
  const rows = await db
    .select({
      exerciseId: workoutExercises.exerciseId,
      workouts: countDistinct(workouts.id).as('workoutCount'),
      lastAt: max(workouts.startedAt).as('lastAt'),
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(eq(workouts.userId, userId), isNull(workouts.deletedAt), isNull(workoutExercises.deletedAt)))
    .groupBy(workoutExercises.exerciseId);
  return new Map(rows.map((row) => [row.exerciseId, { workouts: row.workouts, lastAt: row.lastAt ?? new Date(0) }]));
}
