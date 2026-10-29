import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { exercises } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { addSet, addWorkoutExercise, deleteSet, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import SetSummary from './SetSummary';

const values = {
  setType: 'normal' as const,
  weightGrams: 60000,
  reps: 8,
  durationSeconds: null,
  distanceMeters: null,
  rpe: null,
  notes: null,
};

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const exerciseId = crypto.randomUUID();
  await db.insert(exercises).values({ id: exerciseId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external' });
  const workout = await startWorkout(db, userId);
  const workoutExerciseId = await addWorkoutExercise(db, workout.id, exerciseId);
  return { db, workoutExerciseId };
}

test('say so when there are no sets', async () => {
  const { db, workoutExerciseId } = await setup();
  await renderWithDatabase(<SetSummary workoutExerciseId={workoutExerciseId} loadType="external" />, { db });

  expect(await screen.findByText('No sets yet')).toBeInTheDocument();
});

test('list the sets that are not deleted', async () => {
  const { db, workoutExerciseId } = await setup();
  await addSet(db, workoutExerciseId, values);
  await deleteSet(db, await addSet(db, workoutExerciseId, { ...values, reps: 99 }));
  await addSet(db, workoutExerciseId, { ...values, reps: 6 });
  await renderWithDatabase(<SetSummary workoutExerciseId={workoutExerciseId} loadType="external" />, { db });

  expect(await screen.findByText('60 kg × 8, 60 kg × 6')).toBeInTheDocument();
});
