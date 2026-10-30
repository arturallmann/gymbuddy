import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { workouts } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { startWorkout } from '@/db/workouts';
import { renderWithDatabase } from '@/testing/render';
import { createTestDatabase } from '@/testing/database';
import StartWorkout from './StartWorkout';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: navigation.push }) }));

beforeEach(() => {
  navigation.push.mockReset();
});

describe('StartWorkout', () => {
  test('start a workout and open it', async () => {
    const { db, user } = await renderWithDatabase(<StartWorkout />);

    await user.click(await screen.findByRole('button', { name: 'Start workout' }));

    const rows = await db.select().from(workouts);
    expect(rows).toHaveLength(1);
    expect(rows[0].endedAt).toBeNull();
    expect(navigation.push).toHaveBeenCalledWith('/workout');
  });

  test('offer to continue the active workout', async () => {
    const { db } = await createTestDatabase();
    const { userId } = await getLocalSettings(db);
    await startWorkout(db, userId);
    await renderWithDatabase(<StartWorkout />, { db });

    expect(await screen.findByRole('link', { name: /Continue workout/ })).toHaveAttribute('href', '/workout');
    expect(screen.queryByRole('button', { name: 'Start workout' })).not.toBeInTheDocument();
  });
});
