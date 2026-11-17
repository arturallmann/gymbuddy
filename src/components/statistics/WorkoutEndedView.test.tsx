import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getLocalSettings } from '@/db/settings';
import { addSet } from '@/db/sets';
import { addWorkoutExercise } from '@/db/workoutExercises';
import { endWorkout, startWorkout } from '@/db/workouts';
import { backStack } from '@/lib/backStack';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import WorkoutEndedView from './WorkoutEndedView';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push }),
}));

beforeEach(() => {
  navigation.push.mockReset();
});

const values = (weightGrams: number, reps: number) => ({
  setType: 'normal' as const,
  weightGrams,
  reps,
  durationSeconds: null,
  distanceMeters: null,
  rpe: null,
  notes: null,
});

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const { press, curl } = await addTestLibrary(db);
  const earlier = await startWorkout(db, userId, new Date(2026, 10, 9, 18));
  await addSet(db, await addWorkoutExercise(db, earlier.id, press), values(80000, 5));
  await endWorkout(db, earlier.id);
  const workout = await startWorkout(db, userId, new Date(2026, 10, 16, 18, 0));
  const bench = await addWorkoutExercise(db, workout.id, press);
  await addSet(db, bench, values(85000, 5));
  await addSet(db, bench, values(80000, 5));
  await addSet(db, await addWorkoutExercise(db, workout.id, curl), values(20000, 10));
  await endWorkout(db, workout.id, new Date(2026, 10, 16, 18, 58));
  navigation.params = new URLSearchParams({ id: workout.id });
  return renderWithDatabase(<WorkoutEndedView />, { db });
}

describe('WorkoutEndedView (decision 046)', () => {
  test('show what the workout did: summary, muscle map and personal records', async () => {
    await setup();

    expect(await screen.findByRole('heading', { name: 'Workout ended' })).toBeInTheDocument();
    expect(screen.getByText(/58 min$/)).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Workout summary' });
    expect(within(summary).getByText('Sets').nextSibling).toHaveTextContent('3');
    // Chest: 2 bench sets. Biceps: 1 curl set + 2 bench sets × ½.
    expect(screen.getByRole('button', { name: 'Chest, 2 sets' })).toHaveClass('fill-heat-5');
    expect(screen.getByRole('button', { name: 'Biceps, 2 sets' })).toHaveClass('fill-heat-5');
    expect(screen.getByRole('button', { name: 'Quadriceps, 0 sets' })).toHaveClass('fill-heat-0');
    expect(screen.getByRole('region', { name: 'Personal records' })).toHaveTextContent('Bench Press · Heaviest weight 85 kg');
  });

  test('show a tapped muscle group with its sets and exercises', async () => {
    const { user } = await setup();

    await user.click(await screen.findByRole('button', { name: 'Biceps, 2 sets' }));

    const card = screen.getByRole('region', { name: 'Biceps' });
    expect(within(card).getByText('As primary · as secondary (½)').nextSibling).toHaveTextContent('1 · 1');
    // 20 kg × 10 + (85 kg × 5 + 80 kg × 5) × ½
    expect(within(card).getByText('Volume').nextSibling).toHaveTextContent('612.5 kg');
    expect(card).toHaveTextContent('Bench Press, Barbell Curl');
  });

  test('go home with Done and with Android Back', async () => {
    const { user } = await setup();

    await user.click(await screen.findByRole('button', { name: 'Done' }));
    expect(navigation.push).toHaveBeenLastCalledWith('/');

    navigation.push.mockReset();
    backStack.back();
    expect(navigation.push).toHaveBeenLastCalledWith('/');
  });
});
