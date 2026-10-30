import { and, eq, gte, isNull, lt, or } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { exercises, sets, workoutExercises, workouts, type LoadType } from './schema';
import type { ImportWorkout } from '@/lib/importTable';

export type ImportResult = {
  addedWorkouts: number;
  // Workouts whose date and start time (to the minute) already exist.
  skippedWorkouts: number;
  addedSets: number;
  // Names of custom exercises that the import created.
  createdExercises: string[];
};

const MINUTE = 60 * 1000;

// What an unknown exercise tracks, from the values its sets have in the file.
function newExerciseFields(name: string, all: ImportWorkout[]) {
  const found = all.flatMap((workout) => workout.exercises).filter((item) => item.name.toLowerCase() === name.toLowerCase());
  const allSets = found.flatMap((item) => item.sets);
  const loadType: LoadType =
    found.find((item) => item.loadType)?.loadType ?? (allSets.some((set) => set.weightGrams !== null) ? 'external' : 'none');
  return {
    loadType,
    tracksReps: allSets.some((set) => set.reps !== null),
    tracksDuration: allSets.some((set) => set.durationSeconds !== null),
    tracksDistance: allSets.some((set) => set.distanceMeters !== null),
  };
}

// Adds the workouts in one transaction, so a failure leaves nothing half imported (decision 024).
export async function importWorkouts(db: AppDatabase, userId: string, toImport: ImportWorkout[]): Promise<ImportResult> {
  return db.transaction(async (tx) => {
    const result: ImportResult = { addedWorkouts: 0, skippedWorkouts: 0, addedSets: 0, createdExercises: [] };

    // Exercise names the user can see: library exercises and their own custom exercises.
    const visible = await tx
      .select({ id: exercises.id, name: exercises.name, userId: exercises.userId })
      .from(exercises)
      .where(and(isNull(exercises.deletedAt), or(isNull(exercises.userId), eq(exercises.userId, userId))));
    const byName = new Map<string, string>();
    // Library names first, so a custom exercise with the same name wins.
    for (const exercise of [...visible].sort((a, b) => Number(a.userId !== null) - Number(b.userId !== null))) {
      byName.set(exercise.name.toLowerCase(), exercise.id);
    }

    for (const workout of toImport) {
      const minute = Math.floor(workout.startedAt.getTime() / MINUTE) * MINUTE;
      const [existing] = await tx
        .select({ id: workouts.id })
        .from(workouts)
        .where(
          and(
            eq(workouts.userId, userId),
            isNull(workouts.deletedAt),
            gte(workouts.startedAt, new Date(minute)),
            lt(workouts.startedAt, new Date(minute + MINUTE)),
          ),
        )
        .limit(1);
      if (existing) {
        result.skippedWorkouts++;
        continue;
      }

      const workoutId = crypto.randomUUID();
      await tx.insert(workouts).values({
        id: workoutId,
        userId,
        startedAt: workout.startedAt,
        endedAt: workout.endedAt,
        notes: workout.notes,
      });
      for (const [index, item] of workout.exercises.entries()) {
        let exerciseId = byName.get(item.name.toLowerCase());
        if (!exerciseId) {
          exerciseId = crypto.randomUUID();
          await tx.insert(exercises).values({
            id: exerciseId,
            userId,
            source: 'custom',
            name: item.name,
            category: 'strength',
            ...newExerciseFields(item.name, toImport),
          });
          byName.set(item.name.toLowerCase(), exerciseId);
          result.createdExercises.push(item.name);
        }
        const workoutExerciseId = crypto.randomUUID();
        await tx.insert(workoutExercises).values({
          id: workoutExerciseId,
          workoutId,
          exerciseId,
          position: index + 1,
          phase: item.phase,
          notes: item.notes,
        });
        for (const [setIndex, set] of item.sets.entries()) {
          await tx.insert(sets).values({ ...set, workoutExerciseId, position: setIndex + 1, completedAt: workout.endedAt });
        }
        result.addedSets += item.sets.length;
      }
      result.addedWorkouts++;
    }
    return result;
  });
}
