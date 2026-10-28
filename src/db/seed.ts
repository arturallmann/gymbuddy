import { and, eq, isNull, sql } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import {
  exerciseImages,
  exerciseMuscleGroups,
  exercises,
  muscleGroups,
  type Category,
  type ExerciseSource,
  type LoadType,
  type MuscleGroupRole,
} from './schema';

// One exercise as it appears in data/free-exercise-db/exercises.json.
export type SourceExercise = {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
};

const SOURCE: ExerciseSource = 'free-exercise-db';
const IMAGE_LICENSE = 'Unlicense';
const IMAGE_ATTRIBUTION = 'free-exercise-db (github.com/yuhonas/free-exercise-db)';
const DEFAULT_STRETCH_SECONDS = 30;
// Rows per INSERT. Each statement is one call into native code.
const CHUNK_SIZE = 50;

export type LibraryExercise = {
  sourceId: string;
  name: string;
  instructions: string | null;
  category: Category;
  equipment: string | null;
  loadType: LoadType;
  tracksReps: boolean;
  tracksDuration: boolean;
  tracksDistance: boolean;
  defaultDurationSeconds: number | null;
  muscleGroups: { key: string; role: MuscleGroupRole }[];
  images: string[];
};

export function toLibraryExercise(source: SourceExercise): LibraryExercise {
  const category: Category =
    source.category === 'stretching' ? 'stretch' : source.category === 'cardio' ? 'cardio' : 'strength';

  let loadType: LoadType;
  if (category !== 'strength' || source.equipment === 'foam roll' || source.equipment === 'bands') {
    loadType = 'none';
  } else if (source.equipment === 'body only' || source.equipment === null) {
    loadType = 'bodyweight';
  } else {
    loadType = 'external';
  }

  // Static strength exercises, such as Plank, are held for time.
  const isHold = category === 'strength' && source.force === 'static';

  const roles = new Map<string, MuscleGroupRole>();
  for (const key of source.primaryMuscles) roles.set(key, 'primary');
  for (const key of source.secondaryMuscles) if (!roles.has(key)) roles.set(key, 'secondary');

  return {
    sourceId: source.id,
    name: source.name,
    instructions: source.instructions.length > 0 ? source.instructions.join('\n') : null,
    category,
    equipment: source.equipment,
    loadType,
    tracksReps: category === 'strength' && !isHold,
    tracksDuration: category !== 'strength' || isHold,
    tracksDistance: category === 'cardio',
    defaultDurationSeconds: category === 'stretch' ? DEFAULT_STRETCH_SECONDS : null,
    muscleGroups: [...roles].map(([key, role]) => ({ key, role })),
    images: source.images,
  };
}

// "lower back" → "Lower back"
export function muscleGroupName(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function chunks<T>(items: T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    result.push(items.slice(i, i + CHUNK_SIZE));
  }
  return result;
}

// Inserts or updates the library. Never touches custom exercises.
export async function seedLibrary(db: AppDatabase, source: SourceExercise[]) {
  const library = source.map(toLibraryExercise);
  const keys = [...new Set(library.flatMap((exercise) => exercise.muscleGroups.map((group) => group.key)))].sort();

  await db.transaction(async (tx) => {
    for (const chunk of chunks(keys)) {
      await tx
        .insert(muscleGroups)
        .values(chunk.map((key) => ({ key, name: muscleGroupName(key) })))
        .onConflictDoNothing({ target: muscleGroups.key });
    }
    const groupIds = new Map(
      (await tx.select({ id: muscleGroups.id, key: muscleGroups.key }).from(muscleGroups)).map((row) => [
        row.key,
        row.id,
      ]),
    );

    for (const chunk of chunks(library)) {
      await tx
        .insert(exercises)
        .values(
          chunk.map((exercise) => ({
            source: SOURCE,
            sourceId: exercise.sourceId,
            name: exercise.name,
            instructions: exercise.instructions,
            category: exercise.category,
            equipment: exercise.equipment,
            loadType: exercise.loadType,
            tracksReps: exercise.tracksReps,
            tracksDuration: exercise.tracksDuration,
            tracksDistance: exercise.tracksDistance,
            defaultDurationSeconds: exercise.defaultDurationSeconds,
          })),
        )
        .onConflictDoUpdate({
          target: [exercises.source, exercises.sourceId],
          set: {
            name: sql`excluded.name`,
            instructions: sql`excluded.instructions`,
            category: sql`excluded.category`,
            equipment: sql`excluded.equipment`,
            loadType: sql`excluded.loadType`,
            tracksReps: sql`excluded.tracksReps`,
            tracksDuration: sql`excluded.tracksDuration`,
            tracksDistance: sql`excluded.tracksDistance`,
            defaultDurationSeconds: sql`excluded.defaultDurationSeconds`,
            updatedAt: sql`excluded.updatedAt`,
          },
        });
    }
    const exerciseIds = new Map(
      (
        await tx
          .select({ id: exercises.id, sourceId: exercises.sourceId })
          .from(exercises)
          .where(eq(exercises.source, SOURCE))
      ).map((row) => [row.sourceId, row.id]),
    );

    const links = library.flatMap((exercise) =>
      exercise.muscleGroups.map((group) => ({
        exerciseId: exerciseIds.get(exercise.sourceId)!,
        muscleGroupId: groupIds.get(group.key)!,
        role: group.role,
      })),
    );
    for (const chunk of chunks(links)) {
      await tx
        .insert(exerciseMuscleGroups)
        .values(chunk)
        .onConflictDoUpdate({
          target: [exerciseMuscleGroups.exerciseId, exerciseMuscleGroups.muscleGroupId],
          set: { role: sql`excluded.role`, updatedAt: sql`excluded.updatedAt` },
        });
    }

    const images = library.flatMap((exercise) =>
      exercise.images.map((path, index) => ({
        exerciseId: exerciseIds.get(exercise.sourceId)!,
        position: index + 1,
        path,
        license: IMAGE_LICENSE,
        attribution: IMAGE_ATTRIBUTION,
      })),
    );
    for (const chunk of chunks(images)) {
      await tx
        .insert(exerciseImages)
        .values(chunk)
        .onConflictDoUpdate({
          target: [exerciseImages.exerciseId, exerciseImages.position],
          set: { path: sql`excluded.path`, updatedAt: sql`excluded.updatedAt` },
        });
    }
  });
}

// Seeds the library on first start only.
export async function seedLibraryIfEmpty(db: AppDatabase) {
  const existing = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.source, SOURCE), isNull(exercises.deletedAt)))
    .limit(1);
  if (existing.length > 0) {
    return;
  }
  const { default: source } = await import('../../data/free-exercise-db/exercises.json');
  await seedLibrary(db, source as SourceExercise[]);
}
