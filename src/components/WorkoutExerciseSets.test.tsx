import { screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { exercises } from '@/db/schema';
import { saveExercisePreferences } from '@/db/preferences';
import { getLocalSettings } from '@/db/settings';
import { addSet, addWorkoutExercise, listWorkoutExercises, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import WorkoutExerciseSets from './WorkoutExerciseSets';

async function setup(withSet: boolean) {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const exerciseId = crypto.randomUUID();
  await db
    .insert(exercises)
    .values({ id: exerciseId, source: 'custom', name: 'Plank', category: 'strength', loadType: 'bodyweight', tracksDuration: true });
  const workout = await startWorkout(db, userId);
  const id = await addWorkoutExercise(db, workout.id, exerciseId);
  if (withSet) {
    await addSet(db, id, { setType: 'normal', weightGrams: null, reps: null, durationSeconds: 75, distanceMeters: null, rpe: null, notes: null });
  }
  const [item] = await listWorkoutExercises(db, workout.id);
  await renderWithDatabase(<WorkoutExerciseSets item={item} />, { db });
}

test('show the name and the sets read-only', async () => {
  await setup(true);

  const section = screen.getByRole('region', { name: 'Plank' });
  expect(await within(section).findByRole('listitem')).toHaveTextContent('1:15');
  expect(within(section).queryByRole('button')).not.toBeInTheDocument();
});

test('say so without sets', async () => {
  await setup(false);

  expect(await screen.findByText('No sets')).toBeInTheDocument();
});

test('show sets in the unit override of the exercise, and other exercises in the settings unit', async () => {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const library = await addTestLibrary(db);
  await saveExercisePreferences(db, userId, library.curl, { weightUnit: 'lb' });
  const workout = await startWorkout(db, userId);
  const values = { setType: 'normal' as const, weightGrams: 20412, reps: 5, durationSeconds: null, distanceMeters: null, rpe: null, notes: null };
  await addSet(db, await addWorkoutExercise(db, workout.id, library.curl), values);
  await addSet(db, await addWorkoutExercise(db, workout.id, library.press), values);
  const [curl, press] = await listWorkoutExercises(db, workout.id);

  await renderWithDatabase(
    <>
      <WorkoutExerciseSets item={curl} />
      <WorkoutExerciseSets item={press} />
    </>,
    { db },
  );

  expect(await within(screen.getByRole('region', { name: 'Barbell Curl' })).findByText('45 lb × 5')).toBeInTheDocument();
  expect(await within(screen.getByRole('region', { name: 'Bench Press' })).findByText('20.4 kg × 5')).toBeInTheDocument();
});
