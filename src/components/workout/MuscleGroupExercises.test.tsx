import { screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { muscleGroups } from '@/db/schema';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import MuscleGroupExercises from './MuscleGroupExercises';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), router: { push: vi.fn() } }));
vi.mock('next/navigation', () => ({ useSearchParams: () => navigation.params, useRouter: () => navigation.router }));

beforeEach(() => {
  navigation.params = new URLSearchParams();
});

test('list the exercises where the muscle group is primary, to log a set', async () => {
  const { db } = await createTestDatabase();
  await addTestLibrary(db);
  const [biceps] = (await db.select().from(muscleGroups)).filter((group) => group.key === 'biceps');
  navigation.params = new URLSearchParams({ id: biceps.id });

  await renderWithDatabase(<MuscleGroupExercises />, { db });

  expect(await screen.findByRole('heading', { name: 'Biceps' })).toBeInTheDocument();
  // The exercise page returns to this muscle group.
  expect(screen.getByRole('link', { name: /Barbell Curl/ })).toHaveAttribute(
    'href',
    expect.stringMatching(new RegExp(`^/workout/exercise\\?exercise=.+&back=${encodeURIComponent(`/workout/add/muscle?id=${biceps.id}`)}$`)),
  );
  // Biceps is only a secondary muscle group of Bench Press.
  expect(screen.queryByRole('link', { name: /Bench Press/ })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to add exercise' })).toHaveAttribute('href', '/workout/add');
});

test('say so when the muscle group does not exist', async () => {
  navigation.params = new URLSearchParams({ id: 'unknown' });
  await renderWithDatabase(<MuscleGroupExercises />);

  expect(await screen.findByText('This muscle group does not exist.')).toBeInTheDocument();
});

test('show only exercises of the category from the address, and keep it in the back link', async () => {
  const { db } = await createTestDatabase();
  await addTestLibrary(db);
  const [biceps] = (await db.select().from(muscleGroups)).filter((group) => group.key === 'biceps');
  navigation.params = new URLSearchParams({ id: biceps.id, category: 'stretch' });

  await renderWithDatabase(<MuscleGroupExercises />, { db });

  expect(await screen.findByText('No exercise found.')).toBeInTheDocument();
  expect(screen.getByText('Stretch')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to add exercise' })).toHaveAttribute('href', '/workout/add?category=stretch');
});
