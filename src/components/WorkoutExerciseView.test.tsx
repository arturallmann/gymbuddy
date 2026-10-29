import { screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { exercises } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { addWorkoutExercise, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import WorkoutExerciseView from './WorkoutExerciseView';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => navigation.params }));

beforeEach(() => {
  navigation.params = new URLSearchParams();
});

test('show the workout exercise from the address with its set form', async () => {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const exerciseId = crypto.randomUUID();
  await db
    .insert(exercises)
    .values({ id: exerciseId, source: 'custom', name: 'Plank', category: 'strength', loadType: 'bodyweight', tracksDuration: true });
  const workout = await startWorkout(db, userId);
  navigation.params = new URLSearchParams({ id: await addWorkoutExercise(db, workout.id, exerciseId) });

  await renderWithDatabase(<WorkoutExerciseView />, { db });

  expect(await screen.findByRole('heading', { name: 'Plank' })).toBeInTheDocument();
  expect(await screen.findByRole('textbox', { name: 'Duration' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Log set' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '← Workout' })).toHaveAttribute('href', '/workout');
});

test('say so when the workout exercise does not exist', async () => {
  navigation.params = new URLSearchParams({ id: 'unknown' });
  await renderWithDatabase(<WorkoutExerciseView />);

  expect(await screen.findByText('This exercise is not in the workout.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Log set' })).not.toBeInTheDocument();
});

test('say so without an id in the address', async () => {
  await renderWithDatabase(<WorkoutExerciseView />);

  expect(await screen.findByText('This exercise is not in the workout.')).toBeInTheDocument();
});
