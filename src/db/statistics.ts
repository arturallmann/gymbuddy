import { and, asc, eq, gte, inArray, isNotNull, isNull, lt, lte, type SQL } from 'drizzle-orm';
import type { StatisticsExercise, StatisticsRow } from '@/lib/statistics';
import type { AppDatabase } from './driver';
import type { HistoryRow } from './progress';
import { exerciseMuscleGroups, exercises, muscleGroups, sets, workoutExercises, workouts } from './schema';

const setColumns = {
  weightGrams: sets.weightGrams,
  reps: sets.reps,
  durationSeconds: sets.durationSeconds,
  distanceMeters: sets.distanceMeters,
};

export type StatisticsData = { rows: StatisticsRow[]; exercises: Map<string, StatisticsExercise> };

// Every set of the user's ended workouts that started in the time span (from included, to not),
// with the exercises they belong to and their muscle groups. The statistics page uses this.
export async function listStatistics(db: AppDatabase, userId: string, span: { from: Date; to: Date }): Promise<StatisticsData> {
  return loadStatistics(
    db,
    and(
      eq(workouts.userId, userId),
      isNotNull(workouts.endedAt),
      gte(workouts.startedAt, span.from),
      lt(workouts.startedAt, span.to),
    ),
  );
}

// The same for one workout: the muscle map of a workout (decision 046) uses it.
export async function listWorkoutStatistics(db: AppDatabase, workoutId: string): Promise<StatisticsData> {
  return loadStatistics(db, eq(workouts.id, workoutId));
}

async function loadStatistics(db: AppDatabase, which: SQL | undefined): Promise<StatisticsData> {
  const inSpan = and(which, isNull(workouts.deletedAt), isNull(workoutExercises.deletedAt));
  const found = await db
    .select({
      workoutId: workouts.id,
      startedAt: workouts.startedAt,
      exerciseId: workoutExercises.exerciseId,
      ...setColumns,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(inSpan, isNull(sets.deletedAt)))
    .orderBy(asc(workouts.startedAt), asc(workoutExercises.position), asc(sets.position));
  const rows: StatisticsRow[] = found.map(({ workoutId, startedAt, exerciseId, ...set }) => ({
    workoutId,
    startedAt,
    exerciseId,
    set,
  }));
  const ids = [...new Set(rows.map((row) => row.exerciseId))];
  return { rows, exercises: await loadExercises(db, ids) };
}

async function loadExercises(db: AppDatabase, ids: string[]): Promise<Map<string, StatisticsExercise>> {
  const result = new Map<string, StatisticsExercise>();
  // Small chunks keep each query under SQLite's limit of bound values.
  for (let start = 0; start < ids.length; start += 200) {
    const chunk = ids.slice(start, start + 200);
    const found = await db
      .select({
        id: exercises.id,
        name: exercises.name,
        loadType: exercises.loadType,
        tracksReps: exercises.tracksReps,
        tracksDuration: exercises.tracksDuration,
        tracksDistance: exercises.tracksDistance,
      })
      .from(exercises)
      .where(inArray(exercises.id, chunk));
    for (const exercise of found) result.set(exercise.id, { ...exercise, muscleGroups: [] });
    const groups = await db
      .select({
        exerciseId: exerciseMuscleGroups.exerciseId,
        id: muscleGroups.id,
        key: muscleGroups.key,
        name: muscleGroups.name,
        role: exerciseMuscleGroups.role,
      })
      .from(exerciseMuscleGroups)
      .innerJoin(muscleGroups, eq(muscleGroups.id, exerciseMuscleGroups.muscleGroupId))
      .where(
        and(
          inArray(exerciseMuscleGroups.exerciseId, chunk),
          isNull(exerciseMuscleGroups.deletedAt),
          isNull(muscleGroups.deletedAt),
        ),
      )
      .orderBy(asc(muscleGroups.name));
    for (const { exerciseId, ...group } of groups) result.get(exerciseId)?.muscleGroups.push(group);
  }
  return result;
}

// Every set of the exercises in one workout, from workouts that started no later than it, so the
// workout detail page can tell which personal records the workout reached. Rows carry the exercise id.
export async function listHistoryUpTo(
  db: AppDatabase,
  userId: string,
  workout: { id: string; startedAt: Date },
): Promise<(HistoryRow & { exerciseId: string })[]> {
  const inWorkout = db
    .select({ exerciseId: workoutExercises.exerciseId })
    .from(workoutExercises)
    .where(and(eq(workoutExercises.workoutId, workout.id), isNull(workoutExercises.deletedAt)));
  return db
    .select({
      workoutId: workouts.id,
      startedAt: workouts.startedAt,
      exerciseId: workoutExercises.exerciseId,
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
        inArray(workoutExercises.exerciseId, inWorkout),
        lte(workouts.startedAt, workout.startedAt),
        isNull(workouts.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(sets.deletedAt),
      ),
    )
    .orderBy(asc(workouts.startedAt), asc(workoutExercises.position), asc(sets.position));
}
