import { and, asc, eq, exists, getTableColumns, isNotNull, isNull, notInArray, or, sql } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import {
  exerciseImages,
  exerciseMuscleGroups,
  exercises,
  muscleGroups,
  type Category,
  type Exercise,
  type LoadType,
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
  muscleGroups: { id: string; name: string; role: MuscleGroupRole }[];
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
    .select({ id: muscleGroups.id, name: muscleGroups.name, role: exerciseMuscleGroups.role })
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

// What the user fills in for a custom exercise.
export type CustomExerciseInput = {
  name: string;
  category: Category;
  equipment: string | null;
  loadType: LoadType;
  tracksReps: boolean;
  tracksDuration: boolean;
  tracksDistance: boolean;
  primaryMuscleGroupIds: string[];
  secondaryMuscleGroupIds: string[];
};

const ownCustom = (userId: string, id: string) =>
  and(eq(exercises.id, id), eq(exercises.userId, userId), eq(exercises.source, 'custom'), isNull(exercises.deletedAt));

type Transaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

// Writes the muscle group links of an exercise: new ones are added, removed ones
// are deleted, and a link deleted earlier comes back instead of a second row.
// A muscle group in both lists counts as primary.
async function writeMuscleGroups(tx: Transaction, exerciseId: string, input: CustomExerciseInput) {
  const roles = new Map<string, MuscleGroupRole>();
  for (const id of input.secondaryMuscleGroupIds) roles.set(id, 'secondary');
  for (const id of input.primaryMuscleGroupIds) roles.set(id, 'primary');
  const ids = [...roles.keys()];

  await tx
    .update(exerciseMuscleGroups)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(exerciseMuscleGroups.exerciseId, exerciseId),
        isNull(exerciseMuscleGroups.deletedAt),
        ids.length > 0 ? notInArray(exerciseMuscleGroups.muscleGroupId, ids) : undefined,
      ),
    );
  for (const [muscleGroupId, role] of roles) {
    await tx
      .insert(exerciseMuscleGroups)
      .values({ exerciseId, muscleGroupId, role })
      .onConflictDoUpdate({
        target: [exerciseMuscleGroups.exerciseId, exerciseMuscleGroups.muscleGroupId],
        set: { role, deletedAt: null, updatedAt: new Date() },
      });
  }
}

function exerciseValues(input: CustomExerciseInput) {
  return {
    name: input.name.trim(),
    category: input.category,
    equipment: input.equipment?.trim() || null,
    loadType: input.loadType,
    tracksReps: input.tracksReps,
    tracksDuration: input.tracksDuration,
    tracksDistance: input.tracksDistance,
  };
}

// Creates a custom exercise of the user with its muscle groups, in one transaction.
export async function createCustomExercise(
  db: AppDatabase,
  userId: string,
  input: CustomExerciseInput,
): Promise<string> {
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(exercises).values({ ...exerciseValues(input), id, userId, source: 'custom' });
    await writeMuscleGroups(tx, id, input);
  });
  return id;
}

// Changes a custom exercise of the user. Library exercises and other users' exercises stay as they are.
// Logged sets keep their values, also when the load type or tracked fields change.
export async function updateCustomExercise(db: AppDatabase, userId: string, id: string, input: CustomExerciseInput) {
  await db.transaction(async (tx) => {
    const [own] = await tx.select({ id: exercises.id }).from(exercises).where(ownCustom(userId, id));
    if (!own) {
      throw new Error(`Custom exercise ${id} not found`);
    }
    await tx.update(exercises).set(exerciseValues(input)).where(eq(exercises.id, id));
    await writeMuscleGroups(tx, id, input);
  });
}

// Deletes a custom exercise of the user. Workouts that used it still show it.
export async function deleteCustomExercise(db: AppDatabase, userId: string, id: string, deletedAt: Date = new Date()) {
  await db.update(exercises).set({ deletedAt }).where(ownCustom(userId, id));
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
