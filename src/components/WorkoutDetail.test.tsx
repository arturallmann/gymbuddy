import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { exercises, workouts } from '@/db/schema';
import { getLocalSettings, updateSettings } from '@/db/settings';
import { addSet, addWorkoutExercise, endWorkout, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
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

async function setup() {
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
  navigation.params = new URLSearchParams({ id: workout.id });
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
});
