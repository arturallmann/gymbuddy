import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { createCustomExercise } from '@/db/exercises';
import { exercises } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { EMPTY_CUSTOM_EXERCISE } from '@/lib/exercises';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import ExerciseDetailView from './ExerciseDetailView';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push }),
}));

beforeEach(() => {
  navigation.params = new URLSearchParams();
  navigation.push.mockReset();
});

async function setup(name: 'curl' | 'press', exerciseImages = true) {
  const { db } = await createTestDatabase();
  const ids = await addTestLibrary(db);
  navigation.params = new URLSearchParams({ id: ids[name] });
  return renderWithDatabase(<ExerciseDetailView />, { db, settings: { features: { exerciseImages } } });
}

const openTab = async (user: { click: (element: Element) => Promise<void> }, name: string) =>
  user.click(await screen.findByRole('tab', { name }));

describe('ExerciseDetailView', () => {
  test('start on Progress, and show notes and units on the Notes tab', async () => {
    const { user } = await setup('curl');

    expect(await screen.findByRole('tab', { name: 'Progress' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('No sets yet.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    await openTab(user, 'Notes');
    expect(screen.getByRole('textbox', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Weight unit' })).toBeInTheDocument();
  });

  test('show the exercise with images, muscle groups and instructions on About', async () => {
    const { user } = await setup('curl');

    expect(await screen.findByRole('heading', { name: 'Barbell Curl' })).toBeInTheDocument();
    expect(screen.getByText('Strength · Barbell')).toBeInTheDocument();
    await openTab(user, 'About');
    expect(screen.getByRole('img', { name: 'Barbell Curl, image 1' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Barbell Curl, image 2' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Photos' })).not.toBeInTheDocument();
    expect(screen.getByText('Primary muscle groups:').parentElement).toHaveTextContent('Biceps');
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Stand up straight.',
      'Curl the bar.',
    ]);
    expect(screen.getByRole('link', { name: 'Back to exercises' })).toHaveAttribute('href', '/exercises');
  });

  test('show secondary muscle groups', async () => {
    const { user } = await setup('press');
    await openTab(user, 'About');

    expect(await screen.findByText('Secondary muscle groups:')).toBeInTheDocument();
    expect(screen.getByText('Secondary muscle groups:').parentElement).toHaveTextContent('Biceps');
    expect(screen.queryByRole('heading', { name: 'Instructions' })).not.toBeInTheDocument();
  });

  test('hide images when the exerciseImages toggle is off', async () => {
    const { user } = await setup('curl', false);

    expect(await screen.findByRole('heading', { name: 'Barbell Curl' })).toBeInTheDocument();
    await openTab(user, 'About');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Instructions' })).toBeInTheDocument();
  });

  test('offer no Edit or Delete for a library exercise', async () => {
    const { user } = await setup('curl');

    await screen.findByRole('heading', { name: 'Barbell Curl' });
    await openTab(user, 'About');
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete exercise' })).not.toBeInTheDocument();
  });

  test('edit and delete a custom exercise', async () => {
    const { db } = await createTestDatabase();
    const { userId } = await getLocalSettings(db);
    const id = await createCustomExercise(db, userId, { ...EMPTY_CUSTOM_EXERCISE, name: 'Band Curl' });
    navigation.params = new URLSearchParams({ id });
    const { user } = await renderWithDatabase(<ExerciseDetailView />, { db });

    expect(await screen.findByText(/Custom exercise · Strength/)).toBeInTheDocument();
    await openTab(user, 'About');
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', `/exercises/edit?id=${id}`);
    await user.click(screen.getByRole('button', { name: 'Delete exercise' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const [row] = await db.select().from(exercises).where(eq(exercises.id, id));
    expect(row.deletedAt).not.toBeNull();
    expect(navigation.push).toHaveBeenCalledWith('/exercises');
  });

  test('say so when the exercise does not exist', async () => {
    navigation.params = new URLSearchParams({ id: 'unknown' });
    await renderWithDatabase(<ExerciseDetailView />);

    expect(await screen.findByText('This exercise does not exist.')).toBeInTheDocument();
  });

  test('show Photos with take and choose for a custom exercise, but not for a library exercise', async () => {
    const { db } = await createTestDatabase();
    const { userId } = await getLocalSettings(db);
    const id = await createCustomExercise(db, userId, { ...EMPTY_CUSTOM_EXERCISE, name: 'Cable Thing' });
    navigation.params = new URLSearchParams({ id });
    const { user } = await renderWithDatabase(<ExerciseDetailView />, { db });

    await openTab(user, 'About');
    expect(await screen.findByRole('region', { name: 'Photos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose photo' })).toBeInTheDocument();
  });

  test('hide Photos when exercise images are off', async () => {
    const { db } = await createTestDatabase();
    const { userId } = await getLocalSettings(db);
    const id = await createCustomExercise(db, userId, { ...EMPTY_CUSTOM_EXERCISE, name: 'Cable Thing' });
    navigation.params = new URLSearchParams({ id });
    const { user } = await renderWithDatabase(<ExerciseDetailView />, { db, settings: { features: { exerciseImages: false } } });

    expect(await screen.findByRole('heading', { name: 'Cable Thing' })).toBeInTheDocument();
    await openTab(user, 'About');
    expect(screen.queryByRole('region', { name: 'Photos' })).not.toBeInTheDocument();
  });
});
