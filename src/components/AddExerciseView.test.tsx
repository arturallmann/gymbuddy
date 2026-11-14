import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { exerciseMuscleGroups, exercises, muscleGroups } from '@/db/schema';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import AddExerciseView from './AddExerciseView';

const navigation = vi.hoisted(() => {
  const replace = vi.fn();
  return { params: new URLSearchParams(), replace, router: { replace } };
});
vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => navigation.router,
}));

beforeEach(() => {
  navigation.params = new URLSearchParams();
  navigation.replace.mockReset();
});

// The test library (Barbell Curl for biceps, Bench Press for chest) plus a stretch for hamstrings.
async function setup(features: { supersets?: boolean; templates?: boolean } = {}) {
  const { db } = await createTestDatabase();
  await addTestLibrary(db);
  const hamstrings = crypto.randomUUID();
  const stretch = crypto.randomUUID();
  await db.insert(muscleGroups).values({ id: hamstrings, key: 'hamstrings', name: 'Hamstrings' });
  await db.insert(exercises).values({ id: stretch, source: 'free-exercise-db', name: 'Hamstring Stretch', category: 'stretch', loadType: 'none', tracksDuration: true });
  await db.insert(exerciseMuscleGroups).values({ exerciseId: stretch, muscleGroupId: hamstrings, role: 'primary' });
  return renderWithDatabase(<AddExerciseView />, { db, settings: { features: { supersets: true, templates: true, ...features } } });
}

describe('AddExerciseView', () => {
  test('list the muscle groups, each opening its exercises', async () => {
    const { db } = await setup();
    const [biceps] = (await db.select().from(muscleGroups)).filter((group) => group.key === 'biceps');

    const nav = await screen.findByRole('navigation', { name: 'Muscle groups' });
    expect(await within(nav).findByRole('link', { name: /Biceps/ })).toHaveAttribute('href', `/workout/add/muscle?id=${biceps.id}`);
    expect(within(nav).getByRole('link', { name: /Chest/ })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Hamstrings/ })).toBeInTheDocument();
  });

  test('search exercises directly, each opening the exercise to log a set', async () => {
    const { user } = await setup();

    await user.type(await screen.findByRole('searchbox', { name: 'Search exercises' }), 'curl');

    const link = await screen.findByRole('link', { name: /Barbell Curl/ });
    expect(link).toHaveAttribute('href', expect.stringMatching(/^\/workout\/exercise\?exercise=/));
    expect(screen.queryByRole('link', { name: /Bench Press/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Muscle groups' })).not.toBeInTheDocument();
  });

  test('filter the muscle groups and the search by category, and keep it in the address', async () => {
    const { user } = await setup();
    const nav = await screen.findByRole('navigation', { name: 'Muscle groups' });
    await within(nav).findByRole('link', { name: /Biceps/ });

    await user.click(screen.getByRole('radio', { name: 'Stretch' }));

    expect(navigation.replace).toHaveBeenCalledWith('/workout/add?category=stretch');
    const link = await within(nav).findByRole('link', { name: /Hamstrings/ });
    expect(link).toHaveAttribute('href', expect.stringMatching(/&category=stretch$/));
    expect(within(nav).queryByRole('link', { name: /Biceps/ })).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Search exercises' }), 'e');
    expect(await screen.findByRole('link', { name: /Hamstring Stretch/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Bench Press/ })).not.toBeInTheDocument();
  });

  test('start with the category from the address', async () => {
    navigation.params = new URLSearchParams({ category: 'stretch' });
    await setup();

    expect(await screen.findByRole('radio', { name: 'Stretch' })).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByRole('link', { name: /Hamstrings/ })).toBeInTheDocument();
  });

  test('say so when the search finds nothing', async () => {
    const { user } = await setup();

    await user.type(await screen.findByRole('searchbox', { name: 'Search exercises' }), 'zzz');

    expect(await screen.findByText('No exercise found.')).toBeInTheDocument();
  });

  test('link to saved supersets in the top bar', async () => {
    await setup();

    expect(await screen.findByRole('link', { name: 'Saved supersets' })).toHaveAttribute('href', '/workout/add/superset');
  });

  test('hide the saved supersets link when templates are off', async () => {
    await setup({ templates: false });

    await screen.findByRole('navigation', { name: 'Muscle groups' });
    expect(screen.queryByRole('link', { name: 'Saved supersets' })).not.toBeInTheDocument();
  });
});
