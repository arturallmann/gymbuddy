import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { getLocalSettings } from '@/db/settings';
import { endWorkout, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import WorkoutHistory from './WorkoutHistory';

test('list ended workouts, but not the active workout', async () => {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const ended = await startWorkout(db, userId, new Date('2026-10-01T10:00:00Z'));
  await endWorkout(db, ended.id, new Date('2026-10-01T10:30:00Z'));
  await startWorkout(db, userId);

  await renderWithDatabase(<WorkoutHistory />, { db });

  const links = await screen.findAllByRole('link');
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAttribute('href', `/history/workout?id=${ended.id}`);
  expect(links[0]).toHaveTextContent('30 min · 0 sets');
});
