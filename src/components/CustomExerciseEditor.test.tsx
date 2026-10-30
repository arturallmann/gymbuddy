import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createCustomExercise, getExerciseDetail, searchExercises } from '@/db/exercises';
import { getLocalSettings } from '@/db/settings';
import { EMPTY_CUSTOM_EXERCISE } from '@/lib/exercises';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import CustomExerciseEditor from './CustomExerciseEditor';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push }),
}));

beforeEach(() => {
  navigation.params = new URLSearchParams();
  navigation.push.mockReset();
});

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const library = await addTestLibrary(db);
  return { db, userId, library };
}

describe('CustomExerciseEditor', () => {
  test('create a custom exercise and open its page', async () => {
    const { db, userId } = await setup();
    const { user } = await renderWithDatabase(<CustomExerciseEditor />, { db });

    expect(await screen.findByRole('heading', { name: 'New custom exercise' })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Cable Curl');
    await user.click(within(screen.getByRole('group', { name: 'Primary muscle groups' })).getByRole('checkbox', { name: 'Biceps' }));
    await user.click(screen.getByRole('button', { name: 'Create exercise' }));

    const [created] = await searchExercises(db, userId, 'cable');
    expect(created).toMatchObject({ name: 'Cable Curl', source: 'custom', userId });
    expect((await getExerciseDetail(db, userId, created.id))?.muscleGroups.map((group) => group.name)).toEqual(['Biceps']);
    expect(navigation.push).toHaveBeenCalledWith(`/exercises/detail?id=${created.id}`);
  });

  test('edit a custom exercise with its saved values filled in', async () => {
    const { db, userId, library } = await setup();
    const id = await createCustomExercise(db, userId, {
      ...EMPTY_CUSTOM_EXERCISE,
      name: 'Cable Curl',
      primaryMuscleGroupIds: [library.biceps],
    });
    navigation.params = new URLSearchParams({ id });
    const { user } = await renderWithDatabase(<CustomExerciseEditor />, { db });

    const name = await screen.findByRole('textbox', { name: 'Name' });
    expect(name).toHaveValue('Cable Curl');
    const primary = screen.getByRole('group', { name: 'Primary muscle groups' });
    expect(within(primary).getByRole('checkbox', { name: 'Biceps' })).toBeChecked();
    await user.clear(name);
    await user.type(name, 'Cable Hammer Curl');
    await user.click(screen.getByRole('button', { name: 'Save exercise' }));

    expect((await getExerciseDetail(db, userId, id))?.exercise.name).toBe('Cable Hammer Curl');
    expect(navigation.push).toHaveBeenCalledWith(`/exercises/detail?id=${id}`);
  });

  test('refuse to edit a library exercise', async () => {
    const { db, library } = await setup();
    navigation.params = new URLSearchParams({ id: library.curl });
    await renderWithDatabase(<CustomExerciseEditor />, { db });

    expect(await screen.findByText('Only custom exercises can change.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save exercise' })).not.toBeInTheDocument();
  });
});
