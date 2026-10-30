import { screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { getWorkoutGroup, makeSuperset } from '@/db/groups';
import { exercises } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { addWorkoutExercise, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import GroupLog from './GroupLog';

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const workout = await startWorkout(db, userId);
  const ids: string[] = [];
  for (const name of ['Curl', 'Press']) {
    const id = crypto.randomUUID();
    await db.insert(exercises).values({ id, name, userId, source: 'custom', category: 'strength', loadType: 'external', tracksReps: true });
    ids.push(await addWorkoutExercise(db, workout.id, id));
  }
  const detail = (await getWorkoutGroup(db, await makeSuperset(db, workout.id, ids, 60)))!;
  return { db, detail };
}

test('show the members, the first set to log and the rest length, and report rest changes', async () => {
  const { db, detail } = await setup();
  const onRest = vi.fn().mockResolvedValue(undefined);
  const { user } = await renderWithDatabase(<GroupLog detail={detail} restTimer onRest={onRest} />, { db });

  expect(await screen.findByRole('heading', { name: 'Round 1 · Curl' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Press' })).toHaveAttribute('href', `/workout/exercise?id=${detail.members[1].id}`);
  expect(screen.getByText('1:00')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Less rest' }));
  expect(onRest).toHaveBeenCalledWith(45);
  expect(screen.queryByRole('button', { name: 'Ungroup' })).not.toBeInTheDocument();
});
