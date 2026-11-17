import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { exercises, workouts } from '@/db/schema';
import { getLocalSettings, updateSettings } from '@/db/settings';
import { addBodyweight } from '@/db/bodyweights';
import { addSet } from '@/db/sets';
import { addWorkoutExercise } from '@/db/workoutExercises';
import { endWorkout, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import WorkoutDetail from './WorkoutDetail';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push }),
}));

beforeEach(() => {
  navigation.params = new URLSearchParams();
  navigation.push.mockReset();
});

const values = { setType: 'normal' as const, weightGrams: 60000, reps: 8, durationSeconds: null, distanceMeters: null, rpe: null, notes: null };

async function setup(back?: string) {
  const { db } = await createTestDatabase();
  const local = await getLocalSettings(db);
  await updateSettings(db, local.id, { features: { rpe: false, setNotes: false } });
  const exerciseId = crypto.randomUUID();
  await db.insert(exercises).values({ id: exerciseId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external' });
  const workout = await startWorkout(db, local.userId, new Date('2026-10-01T10:00:00Z'));
  const squat = await addWorkoutExercise(db, workout.id, exerciseId);
  await addSet(db, squat, values);
  await addSet(db, squat, { ...values, reps: 6, rpe: 9, notes: 'belt' });
  await endWorkout(db, workout.id, new Date('2026-10-01T10:50:00Z'));
  navigation.params = new URLSearchParams(back ? { id: workout.id, back } : { id: workout.id });
  const rendered = await renderWithDatabase(<WorkoutDetail />, { db });
  return { ...rendered, workout };
}

describe('WorkoutDetail', () => {
  test('show the workout with its exercises and sets, read-only', async () => {
    await setup();

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('2026');
    expect(screen.getByText('50 min')).toBeInTheDocument();
    const squat = await screen.findByRole('region', { name: 'Squat' });
    const sets = await within(squat).findAllByRole('listitem');
    expect(sets).toHaveLength(2);
    expect(sets[0]).toHaveTextContent('60 kg × 8');
    expect(sets[1]).toHaveTextContent('60 kg × 6 · RPE 9');
    expect(within(squat).queryByRole('button')).not.toBeInTheDocument();
  });

  test('show stored RPE and notes even when their toggles are off', async () => {
    await setup();

    const squat = await screen.findByRole('region', { name: 'Squat' });
    expect(await within(squat).findByText('belt')).toBeInTheDocument();
    expect(within(squat).getByText(/RPE 9/)).toBeInTheDocument();
  });

  test('delete the workout after the confirm step and go back to the workout history', async () => {
    const { db, user, workout } = await setup();

    await user.click(await screen.findByRole('button', { name: 'Delete workout' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const [row] = await db.select().from(workouts);
    expect(row.id).toBe(workout.id);
    expect(row.deletedAt).not.toBeNull();
    expect(navigation.push).toHaveBeenCalledWith('/history');
  });

  test('say so when the workout does not exist', async () => {
    navigation.params = new URLSearchParams({ id: 'unknown' });
    await renderWithDatabase(<WorkoutDetail />);

    expect(await screen.findByText('This workout does not exist.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete workout' })).not.toBeInTheDocument();
  });

  test('go back to the workout history, or to the calendar place it was opened from', async () => {
    await setup();
    expect(await screen.findByRole('link', { name: 'Back to workout history' })).toHaveAttribute('href', '/history');
  });

  test('go back to the calendar place it was opened from', async () => {
    await setup('/calendar?view=week&date=2026-10-01&day=2026-10-01');
    expect(await screen.findByRole('link', { name: 'Back to calendar' })).toHaveAttribute(
      'href',
      '/calendar?view=week&date=2026-10-01&day=2026-10-01',
    );
  });

  test('ignore a back address that is not the calendar', async () => {
    await setup('https://example.com/');
    expect(await screen.findByRole('link', { name: 'Back to workout history' })).toHaveAttribute('href', '/history');
  });
});

describe('WorkoutDetail statistics (decision 043)', () => {
  async function setupTwo(statistics = true) {
    const { db } = await createTestDatabase();
    const local = await getLocalSettings(db);
    await updateSettings(db, local.id, { features: { statistics } });
    const squatId = crypto.randomUUID();
    const dipId = crypto.randomUUID();
    await db.insert(exercises).values([
      { id: squatId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external', tracksReps: true },
      { id: dipId, source: 'custom', name: 'Dips', category: 'strength', loadType: 'bodyweight', tracksReps: true },
    ]);
    const earlier = await startWorkout(db, local.userId, new Date('2026-10-01T10:00:00Z'));
    await addSet(db, await addWorkoutExercise(db, earlier.id, squatId), { ...values, weightGrams: 100000, reps: 5 });
    await addSet(db, await addWorkoutExercise(db, earlier.id, dipId), { ...values, weightGrams: null, reps: 10 });
    await endWorkout(db, earlier.id);
    await addBodyweight(db, local.userId, 80000, new Date('2026-10-01T07:00:00Z'));
    const later = await startWorkout(db, local.userId, new Date('2026-10-08T10:00:00Z'));
    const squat = await addWorkoutExercise(db, later.id, squatId);
    await addSet(db, squat, { ...values, weightGrams: 105000, reps: 3 });
    await addSet(db, squat, { ...values, weightGrams: 100000, reps: 5 });
    await addSet(db, await addWorkoutExercise(db, later.id, dipId), { ...values, weightGrams: null, reps: 10 });
    await endWorkout(db, later.id);
    navigation.params = new URLSearchParams({ id: later.id });
    return renderWithDatabase(<WorkoutDetail />, { db });
  }

  test('sum up the workout and mark the personal records it reached', async () => {
    await setupTwo();

    const summary = await screen.findByRole('region', { name: 'Workout summary' });
    // 105 × 3 + 100 × 5 + (80 bodyweight) × 10 = 1615 kg
    expect(within(summary).getByText('Volume').nextSibling).toHaveTextContent('1615 kg');
    expect(within(summary).getByText('Sets').nextSibling).toHaveTextContent('3');
    expect(within(summary).getByText('Exercises').nextSibling).toHaveTextContent('2');
    expect(within(summary).getByText('PRs').nextSibling).toHaveTextContent('2');
    const squat = screen.getByRole('region', { name: 'Squat' });
    // 105 × 3 has a lower e1RM than 100 × 5, so the e1RM is no record.
    expect(within(within(squat).getByRole('list', { name: 'Personal records' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'PR · Heaviest weight 105 kg',
      'PR · Most volume 815 kg',
    ]);
    // The same dips at a known bodyweight are no record.
    const dips = screen.getByRole('region', { name: 'Dips' });
    expect(within(dips).queryByRole('list', { name: 'Personal records' })).not.toBeInTheDocument();
  });

  test('show the muscle map of the workout (decision 046)', async () => {
    const { db } = await createTestDatabase();
    const local = await getLocalSettings(db);
    const { press } = await addTestLibrary(db);
    const workout = await startWorkout(db, local.userId, new Date('2026-10-08T10:00:00Z'));
    await addSet(db, await addWorkoutExercise(db, workout.id, press), values);
    await endWorkout(db, workout.id);
    navigation.params = new URLSearchParams({ id: workout.id });
    await renderWithDatabase(<WorkoutDetail />, { db });

    const map = await screen.findByRole('region', { name: 'Muscle map' });
    expect(within(map).getByRole('button', { name: 'Chest, 1 set' })).toHaveClass('fill-heat-5');
    expect(within(map).getByRole('button', { name: 'Biceps, 0.5 sets' })).toHaveClass('fill-heat-3');
  });

  test('leave the muscle map out when the exercises have no muscle groups', async () => {
    await setupTwo();

    expect(await screen.findByRole('region', { name: 'Workout summary' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Muscle map' })).not.toBeInTheDocument();
  });

  test('hide the summary and records when the statistics feature toggle is off', async () => {
    await setupTwo(false);

    expect(await screen.findByRole('region', { name: 'Squat' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Workout summary' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Muscle map' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Personal records' })).not.toBeInTheDocument();
  });
});
