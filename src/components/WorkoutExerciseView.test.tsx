import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { saveExercisePreferences } from '@/db/preferences';
import { exercises } from '@/db/schema';
import { getLocalSettings, updateSettings } from '@/db/settings';
import { addWorkoutExercise, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
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

describe('exercise info and preferences', () => {
  async function setup(features = {}) {
    const { db } = await createTestDatabase();
    const local = await getLocalSettings(db);
    await updateSettings(db, local.id, { features });
    const library = await addTestLibrary(db);
    const workout = await startWorkout(db, local.userId);
    const curlId = await addWorkoutExercise(db, workout.id, library.curl);
    const pressId = await addWorkoutExercise(db, workout.id, library.press);
    return { db, userId: local.userId, library, workout, curlId, pressId };
  }

  test('show the first image, a short description and a link to the exercise page', async () => {
    const { db, library, curlId } = await setup();
    navigation.params = new URLSearchParams({ id: curlId });
    await renderWithDatabase(<WorkoutExerciseView />, { db });

    expect(await screen.findByRole('img', { name: 'Barbell Curl, image 1' })).toBeInTheDocument();
    expect(screen.getByText('Strength · Barbell · Biceps')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Exercise details' })).toHaveAttribute(
      'href',
      `/exercises/detail?id=${library.curl}`,
    );
  });

  test('hide the image when the exerciseImages toggle is off', async () => {
    const { db, curlId } = await setup({ exerciseImages: false });
    navigation.params = new URLSearchParams({ id: curlId });
    await renderWithDatabase(<WorkoutExerciseView />, { db });

    expect(await screen.findByText('Strength · Barbell · Biceps')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  test('show the standing notes of the exercise', async () => {
    const { db, userId, library, curlId } = await setup();
    await saveExercisePreferences(db, userId, library.curl, { notes: 'Use the EZ bar.' });
    navigation.params = new URLSearchParams({ id: curlId });
    await renderWithDatabase(<WorkoutExerciseView />, { db });

    expect(await screen.findByText('Use the EZ bar.')).toBeInTheDocument();
  });

  test('switch the set form to lb with a unit override, while other exercises keep kg', async () => {
    const { db, curlId, pressId } = await setup();
    navigation.params = new URLSearchParams({ id: curlId });
    const { user, unmount } = await renderWithDatabase(<WorkoutExerciseView />, { db });

    expect(await screen.findByRole('textbox', { name: 'Weight (kg)' })).toBeInTheDocument();
    await user.click(screen.getByText(/Notes and units/));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Weight unit' }), 'lb');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('textbox', { name: 'Weight (lb)' })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Weight (lb)' }), '45');
    await user.type(screen.getByRole('textbox', { name: 'Reps' }), '5');
    await user.click(screen.getByRole('button', { name: 'Log set' }));
    expect(await screen.findByRole('list', { name: 'Sets' })).toHaveTextContent('45 lb × 5');
    unmount();

    navigation.params = new URLSearchParams({ id: pressId });
    await renderWithDatabase(<WorkoutExerciseView />, { db });
    expect(await screen.findByRole('textbox', { name: 'Weight (kg)' })).toBeInTheDocument();
  });
});
