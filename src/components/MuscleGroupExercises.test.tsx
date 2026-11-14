import { screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { muscleGroups } from '@/db/schema';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import MuscleGroupExercises from './MuscleGroupExercises';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => navigation.params }));

beforeEach(() => {
  navigation.params = new URLSearchParams();
});

test('list the exercises of the muscle group, primary and secondary, to log a set', async () => {
  const { db } = await createTestDatabase();
  await addTestLibrary(db);
  const [biceps] = (await db.select().from(muscleGroups)).filter((group) => group.key === 'biceps');
  navigation.params = new URLSearchParams({ id: biceps.id });

  await renderWithDatabase(<MuscleGroupExercises />, { db });

  expect(await screen.findByRole('heading', { name: 'Biceps' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Barbell Curl/ })).toHaveAttribute(
    'href',
    expect.stringMatching(/^\/workout\/exercise\?exercise=/),
  );
  expect(screen.getByRole('link', { name: /Bench Press/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '← Add exercise' })).toHaveAttribute('href', '/workout/add');
});

test('say so when the muscle group does not exist', async () => {
  navigation.params = new URLSearchParams({ id: 'unknown' });
  await renderWithDatabase(<MuscleGroupExercises />);

  expect(await screen.findByText('This muscle group does not exist.')).toBeInTheDocument();
});
