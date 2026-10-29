import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import ExerciseDetailView from './ExerciseDetailView';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => navigation.params }));

beforeEach(() => {
  navigation.params = new URLSearchParams();
});

async function setup(name: 'curl' | 'press', exerciseImages = true) {
  const { db } = await createTestDatabase();
  const ids = await addTestLibrary(db);
  navigation.params = new URLSearchParams({ id: ids[name] });
  return renderWithDatabase(<ExerciseDetailView />, { db, settings: { features: { exerciseImages } } });
}

describe('ExerciseDetailView', () => {
  test('show the exercise with images, muscle groups and instructions', async () => {
    await setup('curl');

    expect(await screen.findByRole('heading', { name: 'Barbell Curl' })).toBeInTheDocument();
    expect(screen.getByText('Strength · Barbell')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Barbell Curl, image 1' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Barbell Curl, image 2' })).toBeInTheDocument();
    expect(screen.getByText('Primary muscle groups:').parentElement).toHaveTextContent('Biceps');
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Stand up straight.',
      'Curl the bar.',
    ]);
    expect(screen.getByRole('link', { name: '← Exercises' })).toHaveAttribute('href', '/exercises');
  });

  test('show secondary muscle groups', async () => {
    await setup('press');

    expect(await screen.findByText('Secondary muscle groups:')).toBeInTheDocument();
    expect(screen.getByText('Secondary muscle groups:').parentElement).toHaveTextContent('Biceps');
    expect(screen.queryByRole('heading', { name: 'Instructions' })).not.toBeInTheDocument();
  });

  test('hide images when the exerciseImages toggle is off', async () => {
    await setup('curl', false);

    expect(await screen.findByRole('heading', { name: 'Barbell Curl' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Instructions' })).toBeInTheDocument();
  });

  test('say so when the exercise does not exist', async () => {
    navigation.params = new URLSearchParams({ id: 'unknown' });
    await renderWithDatabase(<ExerciseDetailView />);

    expect(await screen.findByText('This exercise does not exist.')).toBeInTheDocument();
  });
});
