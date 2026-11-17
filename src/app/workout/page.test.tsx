import { screen } from '@testing-library/react';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { workouts } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import WorkoutPage from './page';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: navigation.push }) }));

beforeEach(() => {
  navigation.push.mockReset();
});

async function withActiveWorkout(statistics = true) {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const workout = await startWorkout(db, userId, new Date(Date.now() - 65_000));
  const rendered = await renderWithDatabase(<WorkoutPage />, { db, settings: { features: { statistics } } });
  return { ...rendered, workout };
}

async function saved(db: Awaited<ReturnType<typeof createTestDatabase>>['db'], id: string) {
  const [row] = await db.select().from(workouts).where(eq(workouts.id, id));
  return row;
}

describe('workout page', () => {
  test('show how long the active workout has run', async () => {
    await withActiveWorkout();

    expect(await screen.findByText(/^1:0\d$/)).toBeInTheDocument();
  });

  test('end the workout and open the Workout ended page (decision 046)', async () => {
    const { db, user, workout } = await withActiveWorkout();

    await user.click(await screen.findByRole('button', { name: 'End workout' }));

    const row = await saved(db, workout.id);
    expect(row.endedAt).not.toBeNull();
    expect(row.deletedAt).toBeNull();
    expect(navigation.push).toHaveBeenCalledWith(`/workout/ended?id=${workout.id}`);
  });

  test('go back home after End workout when the statistics feature toggle is off', async () => {
    const { user } = await withActiveWorkout(false);

    await user.click(await screen.findByRole('button', { name: 'End workout' }));

    expect(navigation.push).toHaveBeenCalledWith('/');
  });

  test('offer + to add an exercise, and no discard', async () => {
    await withActiveWorkout();

    expect(await screen.findByRole('link', { name: 'Add exercise' })).toHaveAttribute('href', '/workout/add');
    // A drawn plus, centered in its button; a text "+" sat low (5.2.5).
    expect(screen.getByRole('link', { name: 'Add exercise' }).querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Add exercise' })).not.toHaveTextContent('+');
    expect(screen.queryByRole('button', { name: 'Discard workout' })).not.toBeInTheDocument();
  });

  test('say so when there is no active workout', async () => {
    await renderWithDatabase(<WorkoutPage />);

    expect(await screen.findByText('No active workout.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'End workout' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add exercise' })).not.toBeInTheDocument();
  });
});
