import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { saveExercisePreferences } from '@/db/preferences';
import { exercises } from '@/db/schema';
import { getLocalSettings, updateSettings } from '@/db/settings';
import { addWorkoutExercise, endWorkout, listSets, listWorkoutExercises, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import WorkoutExerciseView from './WorkoutExerciseView';

const navigation = vi.hoisted(() => {
  const replace = vi.fn();
  // One router object for every render, as in Next.js.
  return { params: new URLSearchParams(), replace, router: { replace } };
});
vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => navigation.router,
}));

beforeEach(() => {
  navigation.params = new URLSearchParams();
  navigation.replace.mockReset();
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
  expect(screen.getByRole('link', { name: 'Back to workout' })).toHaveAttribute('href', '/workout');
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

  test('start on the Log tab, and show image, description and a link to the exercise page on About', async () => {
    const { db, library, curlId } = await setup();
    navigation.params = new URLSearchParams({ id: curlId });
    const { user } = await renderWithDatabase(<WorkoutExerciseView />, { db });

    expect(await screen.findByRole('tab', { name: 'Log' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('button', { name: 'Log set' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'About' }));
    expect(await screen.findByRole('img', { name: 'Barbell Curl, image 1' })).toBeInTheDocument();
    expect(screen.getByText('Strength · Barbell · Biceps')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log set' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Exercise details and progress/ })).toHaveAttribute(
      'href',
      `/exercises/detail?id=${library.curl}`,
    );
  });

  test('swipe left to About and right back to Log (decision 044)', async () => {
    const { db, curlId } = await setup();
    navigation.params = new URLSearchParams({ id: curlId });
    await renderWithDatabase(<WorkoutExerciseView />, { db });
    const tab = await screen.findByRole('tab', { name: 'Log' });

    fireEvent.touchStart(tab, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchEnd(tab, { changedTouches: [{ clientX: 100, clientY: 100 }] });
    expect(screen.getByRole('tab', { name: 'About' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.touchStart(tab, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(tab, { changedTouches: [{ clientX: 300, clientY: 100 }] });
    expect(screen.getByRole('tab', { name: 'Log' })).toHaveAttribute('aria-selected', 'true');
  });

  test('hide the image when the exerciseImages toggle is off', async () => {
    const { db, curlId } = await setup({ exerciseImages: false });
    navigation.params = new URLSearchParams({ id: curlId });
    const { user } = await renderWithDatabase(<WorkoutExerciseView />, { db });

    await user.click(await screen.findByRole('tab', { name: 'About' }));
    expect(await screen.findByText('Strength · Barbell · Biceps')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  test('show the standing notes of the exercise on the Log tab', async () => {
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
    await user.click(screen.getByRole('tab', { name: 'About' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Weight unit' }), 'lb');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('tab', { name: 'Log' }));
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

describe('phase', () => {
  async function withItem(phases: boolean) {
    const { db } = await createTestDatabase();
    const local = await getLocalSettings(db);
    await updateSettings(db, local.id, { features: { phases } });
    const library = await addTestLibrary(db);
    const workout = await startWorkout(db, local.userId);
    const id = await addWorkoutExercise(db, workout.id, library.curl);
    navigation.params = new URLSearchParams({ id });
    const rendered = await renderWithDatabase(<WorkoutExerciseView />, { db });
    return { ...rendered, workout };
  }

  test('move the workout exercise to another phase', async () => {
    const { db, user, workout } = await withItem(true);

    await user.click(await screen.findByRole('tab', { name: 'About' }));
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Phase' }), 'Warm-up phase');

    await waitFor(async () => expect((await listWorkoutExercises(db, workout.id))[0].phase).toBe('warmup'));
    expect(screen.getByRole('combobox', { name: 'Phase' })).toHaveValue('warmup');
  });

  test('hide the phase choice when phases are off', async () => {
    const { user } = await withItem(false);

    expect(await screen.findByRole('button', { name: 'Log set' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'About' }));
    expect(await screen.findByRole('region', { name: 'Notes and units' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Phase' })).not.toBeInTheDocument();
  });
});

describe('an exercise from the Add exercise page', () => {
  async function withExercise({ phases = false, stretch = false } = {}) {
    const { db } = await createTestDatabase();
    const local = await getLocalSettings(db);
    await updateSettings(db, local.id, { features: { phases } });
    const exerciseId = crypto.randomUUID();
    await db.insert(exercises).values(
      stretch
        ? { id: exerciseId, source: 'custom', name: 'Hamstring Stretch', category: 'stretch', loadType: 'none', tracksReps: true }
        : { id: exerciseId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external', tracksReps: true },
    );
    const workout = await startWorkout(db, local.userId);
    navigation.params = new URLSearchParams({ exercise: exerciseId });
    return { db, workout, exerciseId };
  }

  test('open it without adding it, then add it with the first set', async () => {
    const { db, workout } = await withExercise();
    const { user } = await renderWithDatabase(<WorkoutExerciseView />, { db });

    expect(await screen.findByRole('heading', { name: 'Squat' })).toBeInTheDocument();
    expect(screen.getByText('Log a set to add this exercise to the workout.')).toBeInTheDocument();
    expect(await listWorkoutExercises(db, workout.id)).toEqual([]);

    await user.type(await screen.findByRole('textbox', { name: 'Reps' }), '5');
    await user.click(screen.getByRole('button', { name: 'Log set' }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalled());
    const [item] = await listWorkoutExercises(db, workout.id);
    expect(item).toMatchObject({ name: 'Squat', phase: 'main' });
    expect(navigation.replace).toHaveBeenCalledWith(`/workout/exercise?id=${item.id}`);
    expect(await listSets(db, item.id)).toEqual([expect.objectContaining({ reps: 5, position: 1 })]);
  });

  test('add a stretch to the cool-down phase when phases are on, without a phase choice before', async () => {
    const { db, workout } = await withExercise({ phases: true, stretch: true });
    const { user } = await renderWithDatabase(<WorkoutExerciseView />, { db });

    await user.type(await screen.findByRole('textbox', { name: 'Reps' }), '1');
    expect(screen.queryByRole('combobox', { name: 'Phase' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Log set' }));

    await waitFor(async () => expect((await listWorkoutExercises(db, workout.id))[0]?.phase).toBe('cooldown'));
  });

  test('open the workout exercise when the exercise is already in the workout', async () => {
    const { db, workout, exerciseId } = await withExercise();
    const id = await addWorkoutExercise(db, workout.id, exerciseId);

    await renderWithDatabase(<WorkoutExerciseView />, { db });

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(`/workout/exercise?id=${id}`));
  });

  test('say so when there is no active workout', async () => {
    const { db, workout } = await withExercise();
    await endWorkout(db, workout.id);

    await renderWithDatabase(<WorkoutExerciseView />, { db });

    expect(await screen.findByText('This exercise is not in the workout.')).toBeInTheDocument();
  });
});
