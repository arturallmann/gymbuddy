import { and, asc, eq, exists, getTableColumns, isNull, or, sql } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import {
  exerciseImages,
  exerciseMuscleGroups,
  exercises,
  muscleGroups,
  type Exercise,
  type MuscleGroup,
  type MuscleGroupRole,
} from './schema';

const SEARCH_LIMIT = 50;

// An exercise in a list, with the path of its first image, if any.
export type ExerciseListItem = Exercise & { imagePath: string | null };

type SearchOptions = {
  // Only exercises that work this muscle group, as primary or secondary muscle group.
  muscleGroupId?: string | null;
  limit?: number;
};

// "50%_curl" matches the text as typed, not as a LIKE pattern.
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Exercises the user can see: library exercises and their own custom exercises.
const visibleTo = (userId: string) =>
  and(isNull(exercises.deletedAt), or(isNull(exercises.userId), eq(exercises.userId, userId)));

// Library exercises and the user's custom exercises whose name contains `query`,
// sorted by name. An empty query returns the first exercises by name.
export async function searchExercises(
  db: AppDatabase,
  userId: string,
  query: string,
  { muscleGroupId = null, limit = SEARCH_LIMIT }: SearchOptions = {},
): Promise<ExerciseListItem[]> {
  const text = query.trim();
  return db
    .select({ ...getTableColumns(exercises), imagePath: exerciseImages.path })
    .from(exercises)
    .leftJoin(
      exerciseImages,
      and(
        eq(exerciseImages.exerciseId, exercises.id),
        eq(exerciseImages.position, 1),
        isNull(exerciseImages.deletedAt),
      ),
    )
    .where(
      and(
        visibleTo(userId),
        text ? sql`${exercises.name} LIKE ${`%${escapeLike(text)}%`} ESCAPE '\\'` : undefined,
        muscleGroupId
          ? exists(
              db
                .select({ id: exerciseMuscleGroups.id })
                .from(exerciseMuscleGroups)
                .where(
                  and(
                    eq(exerciseMuscleGroups.exerciseId, exercises.id),
                    eq(exerciseMuscleGroups.muscleGroupId, muscleGroupId),
                    isNull(exerciseMuscleGroups.deletedAt),
                  ),
                ),
            )
          : undefined,
      ),
    )
    .orderBy(asc(exercises.name))
    .limit(limit);
}

// All muscle groups, sorted by name.
export async function listMuscleGroups(db: AppDatabase): Promise<MuscleGroup[]> {
  return db.select().from(muscleGroups).where(isNull(muscleGroups.deletedAt)).orderBy(asc(muscleGroups.name));
}

export type ExerciseDetail = {
  exercise: Exercise;
  // Primary muscle groups first, then by name.
  muscleGroups: { name: string; role: MuscleGroupRole }[];
  // Image paths in order.
  images: string[];
};

// One exercise the user can see, with its muscle groups and images, or null.
export async function getExerciseDetail(db: AppDatabase, userId: string, id: string): Promise<ExerciseDetail | null> {
  const [exercise] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, id), visibleTo(userId)));
  if (!exercise) {
    return null;
  }
  const groups = await db
    .select({ name: muscleGroups.name, role: exerciseMuscleGroups.role })
    .from(exerciseMuscleGroups)
    .innerJoin(muscleGroups, eq(muscleGroups.id, exerciseMuscleGroups.muscleGroupId))
    .where(and(eq(exerciseMuscleGroups.exerciseId, id), isNull(exerciseMuscleGroups.deletedAt)))
    .orderBy(asc(exerciseMuscleGroups.role), asc(muscleGroups.name));
  const images = await db
    .select({ path: exerciseImages.path })
    .from(exerciseImages)
    .where(and(eq(exerciseImages.exerciseId, id), isNull(exerciseImages.deletedAt)))
    .orderBy(asc(exerciseImages.position));
  return { exercise, muscleGroups: groups, images: images.map((image) => image.path) };
}
