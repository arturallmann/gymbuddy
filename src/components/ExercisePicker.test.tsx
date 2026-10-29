import { screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { exercises } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import ExercisePicker from './ExercisePicker';

async function withExercises(...names: string[]) {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  for (const name of names) {
    await db.insert(exercises).values({ name, userId, source: 'custom', category: 'strength', loadType: 'external' });
  }
  return db;
}

test('filter exercises by name and pick one', async () => {
  const db = await withExercises('Bench Press', 'Barbell Curl', 'Hammer Curl');
  const onPick = vi.fn();
  const { user } = await renderWithDatabase(<ExercisePicker onPick={onPick} onClose={vi.fn()} />, { db });

  expect(await screen.findByRole('button', { name: 'Bench Press' })).toBeInTheDocument();
  await user.type(screen.getByRole('searchbox', { name: 'Search exercises' }), 'curl');
  await screen.findByRole('button', { name: 'Hammer Curl' });
  expect(screen.queryByRole('button', { name: 'Bench Press' })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Hammer Curl' }));
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Hammer Curl' }));
});

test('say so when no exercise matches', async () => {
  const db = await withExercises('Bench Press');
  const { user } = await renderWithDatabase(<ExercisePicker onPick={vi.fn()} onClose={vi.fn()} />, { db });

  await user.type(screen.getByRole('searchbox', { name: 'Search exercises' }), 'zzz');

  expect(await screen.findByText('No exercise found.')).toBeInTheDocument();
});

test('close without picking', async () => {
  const onClose = vi.fn();
  const { user } = await renderWithDatabase(<ExercisePicker onPick={vi.fn()} onClose={onClose} />);

  await user.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(onClose).toHaveBeenCalledOnce();
});
