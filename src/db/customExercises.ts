// Queries for custom exercises: creating, changing and deleting them, and their photos (decision 039).
import { and, eq, exists, isNull, max, notInArray } from 'drizzle-orm';
import type { AppDatabase, Transaction } from './driver';
import {
  exerciseImages,
  exerciseMuscleGroups,
  exercises,
  type Category,
  type LoadType,
  type MuscleGroupRole,
} from './schema';

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

// Adds a photo to the end of the user's custom exercise (decision 039). `storedFile` is the photo's
// file in the app's storage. One transaction, so two photos at once get different positions.
// Returns the new image id, or null when the exercise is not the user's custom exercise.
export async function addExercisePhoto(db: AppDatabase, userId: string, exerciseId: string, storedFile: string): Promise<string | null> {
  const id = crypto.randomUUID();
  const added = await db.transaction(async (tx) => {
    const [own] = await tx.select({ id: exercises.id }).from(exercises).where(ownCustom(userId, exerciseId));
    if (!own) return false;
    const [{ last }] = await tx
      .select({ last: max(exerciseImages.position).as('last') })
      .from(exerciseImages)
      .where(and(eq(exerciseImages.exerciseId, exerciseId), isNull(exerciseImages.deletedAt)));
    await tx.insert(exerciseImages).values({ id, exerciseId, position: (last ?? 0) + 1, path: storedFile, storedFile });
    return true;
  });
  return added ? id : null;
}

// Deletes a photo of the user's custom exercise. Photos of library exercises cannot be deleted.
export async function deleteExercisePhoto(db: AppDatabase, userId: string, imageId: string, deletedAt: Date = new Date()) {
  await db
    .update(exerciseImages)
    .set({ deletedAt })
    .where(
      and(
        eq(exerciseImages.id, imageId),
        isNull(exerciseImages.deletedAt),
        exists(
          db
            .select({ id: exercises.id })
            .from(exercises)
            .where(and(eq(exercises.id, exerciseImages.exerciseId), eq(exercises.userId, userId), eq(exercises.source, 'custom'))),
        ),
      ),
    );
}
