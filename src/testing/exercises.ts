// Test helper: a small exercise library with muscle groups and images.
import type { AppDatabase } from '@/db/driver';
import { exerciseImages, exerciseMuscleGroups, exercises, muscleGroups } from '@/db/schema';

export async function addTestLibrary(db: AppDatabase) {
  const biceps = crypto.randomUUID();
  const chest = crypto.randomUUID();
  await db.insert(muscleGroups).values([
    { id: biceps, key: 'biceps', name: 'Biceps' },
    { id: chest, key: 'chest', name: 'Chest' },
  ]);
  const curl = crypto.randomUUID();
  const press = crypto.randomUUID();
  await db.insert(exercises).values([
    {
      id: curl,
      source: 'free-exercise-db',
      sourceId: 'Barbell_Curl',
      name: 'Barbell Curl',
      category: 'strength',
      equipment: 'barbell',
      loadType: 'external',
      tracksReps: true,
      instructions: 'Stand up straight.\nCurl the bar.',
    },
    {
      id: press,
      source: 'free-exercise-db',
      sourceId: 'Bench_Press',
      name: 'Bench Press',
      category: 'strength',
      equipment: 'barbell',
      loadType: 'external',
      tracksReps: true,
    },
  ]);
  await db.insert(exerciseMuscleGroups).values([
    { exerciseId: curl, muscleGroupId: biceps, role: 'primary' },
    { exerciseId: press, muscleGroupId: chest, role: 'primary' },
    { exerciseId: press, muscleGroupId: biceps, role: 'secondary' },
  ]);
  await db.insert(exerciseImages).values([
    { exerciseId: curl, position: 1, path: 'Barbell_Curl/0.jpg' },
    { exerciseId: curl, position: 2, path: 'Barbell_Curl/1.jpg' },
  ]);
  return { curl, press, biceps, chest };
}
