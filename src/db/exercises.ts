// Queries for exercises: search, muscle groups, images, an exercise's details and the equipment list.
import { and, asc, eq, exists, getTableColumns, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import {
  exerciseImages,
  exerciseMuscleGroups,
  exercises,
  muscleGroups,
  type Category,
  type Exercise,
  type MuscleGroup,
  type MuscleGroupRole,
} from './schema';

const SEARCH_LIMIT = 50;

// An exercise in a list, with its first image, if any: the bundled path and, when the image is
// in the app's storage, its stored file.
export type ExerciseListItem = Exercise & { imagePath: string | null; imageStoredFile: string | null };

// An image of an exercise: bundled at `path`, or a stored file in the app's storage.
export type ExerciseImageItem = { id: string; path: string; storedFile: string | null };

type SearchOptions = {
  // Only exercises that work this muscle group, as primary or secondary muscle group.
  muscleGroupId?: string | null;
  // With muscleGroupId: only exercises where it has this role, such as 'primary'.
  role?: MuscleGroupRole | null;
  // Only exercises of this category.
  category?: Category | null;
  // Only the user's custom exercises.
  customOnly?: boolean;
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
  { muscleGroupId = null, role = null, category = null, customOnly = false, limit = SEARCH_LIMIT }: SearchOptions = {},
): Promise<ExerciseListItem[]> {
  const text = query.trim();
  return db
    .select({ ...getTableColumns(exercises), imagePath: exerciseImages.path, imageStoredFile: exerciseImages.storedFile })
    .from(exercises)
    .leftJoin(
      exerciseImages,
      and(
        eq(exerciseImages.exerciseId, exercises.id),
        isNull(exerciseImages.deletedAt),
        // The first image that is not deleted, so a deleted first photo hands over to the next one.
        eq(
          exerciseImages.position,
          sql`(select min("first"."position") from "exercise_images" as "first" where "first"."exerciseId" = ${exercises.id} and "first"."deletedAt" is null)`,
        ),
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
                    role ? eq(exerciseMuscleGroups.role, role) : undefined,
                    isNull(exerciseMuscleGroups.deletedAt),
                  ),
                ),
            )
          : undefined,
        category ? eq(exercises.category, category) : undefined,
        customOnly ? eq(exercises.source, 'custom') : undefined,
      ),
    )
    .orderBy(asc(exercises.name))
    .limit(limit);
}

// All muscle groups, sorted by name.
export async function listMuscleGroups(db: AppDatabase): Promise<MuscleGroup[]> {
  return db.select().from(muscleGroups).where(isNull(muscleGroups.deletedAt)).orderBy(asc(muscleGroups.name));
}

// The muscle groups that are the primary muscle group of at least one exercise the user can see,
// of `category` when given, sorted by name. The "Add exercise" page lists them (decision 032).
export async function listPrimaryMuscleGroups(
  db: AppDatabase,
  userId: string,
  category: Category | null = null,
): Promise<MuscleGroup[]> {
  return db
    .select()
    .from(muscleGroups)
    .where(
      and(
        isNull(muscleGroups.deletedAt),
        exists(
          db
            .select({ id: exerciseMuscleGroups.id })
            .from(exerciseMuscleGroups)
            .innerJoin(exercises, eq(exercises.id, exerciseMuscleGroups.exerciseId))
            .where(
              and(
                eq(exerciseMuscleGroups.muscleGroupId, muscleGroups.id),
                eq(exerciseMuscleGroups.role, 'primary'),
                isNull(exerciseMuscleGroups.deletedAt),
                visibleTo(userId),
                category ? eq(exercises.category, category) : undefined,
              ),
            ),
        ),
      ),
    )
    .orderBy(asc(muscleGroups.name));
}

export type ExerciseDetail = {
  exercise: Exercise;
  // Primary muscle groups first, then by name.
  muscleGroups: { id: string; name: string; role: MuscleGroupRole }[];
  // Images in order.
  images: ExerciseImageItem[];
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
    .select({ id: muscleGroups.id, name: muscleGroups.name, role: exerciseMuscleGroups.role })
    .from(exerciseMuscleGroups)
    .innerJoin(muscleGroups, eq(muscleGroups.id, exerciseMuscleGroups.muscleGroupId))
    .where(and(eq(exerciseMuscleGroups.exerciseId, id), isNull(exerciseMuscleGroups.deletedAt)))
    .orderBy(asc(exerciseMuscleGroups.role), asc(muscleGroups.name));
  const images = await db
    .select({ id: exerciseImages.id, path: exerciseImages.path, storedFile: exerciseImages.storedFile })
    .from(exerciseImages)
    .where(and(eq(exerciseImages.exerciseId, id), isNull(exerciseImages.deletedAt)))
    .orderBy(asc(exerciseImages.position));
  return { exercise, muscleGroups: groups, images };
}

// Equipment names in use, sorted, so the form can suggest them.
export async function listEquipment(db: AppDatabase): Promise<string[]> {
  const rows = await db
    .selectDistinct({ equipment: exercises.equipment })
    .from(exercises)
    .where(and(isNotNull(exercises.equipment), isNull(exercises.deletedAt)))
    .orderBy(asc(exercises.equipment));
  return rows.flatMap((row) => (row.equipment ? [row.equipment] : []));
}
