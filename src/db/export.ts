import { and, asc, eq, isNull } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { exercises, sets, workoutExercises, workouts, type Exercise, type Workout, type WorkoutExercise, type WorkoutSet } from './schema';

// One set with its workout and exercise, as the export lists it.
export type ExportRow = {
  workoutStartedAt: Workout['startedAt'];
  workoutEndedAt: Workout['endedAt'];
  workoutNotes: Workout['notes'];
  exerciseId: Exercise['id'];
  exerciseName: Exercise['name'];
  loadType: Exercise['loadType'];
  phase: WorkoutExercise['phase'];
  workoutExerciseNotes: WorkoutExercise['notes'];
  setPosition: WorkoutSet['position'];
  setType: WorkoutSet['setType'];
  weightGrams: WorkoutSet['weightGrams'];
  reps: WorkoutSet['reps'];
  durationSeconds: WorkoutSet['durationSeconds'];
  distanceMeters: WorkoutSet['distanceMeters'];
  rpe: WorkoutSet['rpe'];
  setNotes: WorkoutSet['notes'];
};

// Every set of the user that is not deleted, in workout, workout exercise and set order.
// Deleted custom exercises still appear, because their sets are still the user's data.
export async function listExportRows(db: AppDatabase, userId: string): Promise<ExportRow[]> {
  return db
    .select({
      workoutStartedAt: workouts.startedAt,
      workoutEndedAt: workouts.endedAt,
      workoutNotes: workouts.notes,
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      loadType: exercises.loadType,
      phase: workoutExercises.phase,
      workoutExerciseNotes: workoutExercises.notes,
      setPosition: sets.position,
      setType: sets.setType,
      weightGrams: sets.weightGrams,
      reps: sets.reps,
      durationSeconds: sets.durationSeconds,
      distanceMeters: sets.distanceMeters,
      rpe: sets.rpe,
      setNotes: sets.notes,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(
      and(
        eq(workouts.userId, userId),
        isNull(workouts.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(sets.deletedAt),
      ),
    )
    .orderBy(asc(workouts.startedAt), asc(workoutExercises.position), asc(sets.position));
}
