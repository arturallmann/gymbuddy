import { and, asc, eq, isNull } from 'drizzle-orm';
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
