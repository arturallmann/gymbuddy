import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { muscleGroups } from '@/db/schema';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import AddExerciseView from './AddExerciseView';

async function setup(features: { supersets?: boolean; templates?: boolean } = {}) {
  const { db } = await createTestDatabase();
  await addTestLibrary(db);
  return renderWithDatabase(<AddExerciseView />, { db, settings: { features: { supersets: true, templates: true, ...features } } });
}

describe('AddExerciseView', () => {
  test('list the muscle groups, each opening its exercises', async () => {
    const { db } = await setup();
    const [biceps] = (await db.select().from(muscleGroups)).filter((group) => group.key === 'biceps');

    const nav = await screen.findByRole('navigation', { name: 'Muscle groups' });
    expect(await within(nav).findByRole('link', { name: /Biceps/ })).toHaveAttribute('href', `/workout/add/muscle?id=${biceps.id}`);
    expect(within(nav).getByRole('link', { name: /Chest/ })).toBeInTheDocument();
  });

  test('search exercises directly, each opening the exercise to log a set', async () => {
    const { user } = await setup();

    await user.type(await screen.findByRole('searchbox', { name: 'Search exercises' }), 'curl');

    const link = await screen.findByRole('link', { name: /Barbell Curl/ });
    expect(link).toHaveAttribute('href', expect.stringMatching(/^\/workout\/exercise\?exercise=/));
    expect(screen.queryByRole('link', { name: /Bench Press/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Muscle groups' })).not.toBeInTheDocument();
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
