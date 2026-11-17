import { screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { makeSuperset } from '@/db/groups';
import { exercises } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { saveGroupAsTemplate } from '@/db/templates';
import { addWorkoutExercise, endWorkout, listWorkoutExercises, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import AddSavedSupersetView from './AddSavedSupersetView';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: navigation.push }) }));

beforeEach(() => {
  navigation.push.mockReset();
});

test('add a saved superset to the active workout in one tap, then go back to the workout', async () => {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const first = await startWorkout(db, userId);
  const ids: string[] = [];
  for (const name of ['Curl', 'Press']) {
    const id = crypto.randomUUID();
    await db.insert(exercises).values({ id, name, userId, source: 'custom', category: 'strength', loadType: 'external', tracksReps: true });
    ids.push(await addWorkoutExercise(db, first.id, id));
  }
  await saveGroupAsTemplate(db, userId, await makeSuperset(db, first.id, ids, 60), 'Arms');
  await endWorkout(db, first.id);
  const workout = await startWorkout(db, userId);
  const { user } = await renderWithDatabase(<AddSavedSupersetView />, { db });

  await user.click(await screen.findByRole('button', { name: /Arms/ }));

  await waitFor(() => expect(navigation.push).toHaveBeenCalledWith('/workout'));
  const items = await listWorkoutExercises(db, workout.id);
  expect(items.map((item) => item.name)).toEqual(['Curl', 'Press']);
  expect(items.every((item) => item.groupId !== null)).toBe(true);
});

test('say so when there is no active workout', async () => {
  await renderWithDatabase(<AddSavedSupersetView />);

  expect(await screen.findByText('No active workout.')).toBeInTheDocument();
});
