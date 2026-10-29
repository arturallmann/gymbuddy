import { screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import ExerciseBrowser from './ExerciseBrowser';

async function setup(exerciseImages = true) {
  const { db } = await createTestDatabase();
  await addTestLibrary(db);
  return renderWithDatabase(<ExerciseBrowser />, { db, settings: { features: { exerciseImages } } });
}

const names = () => screen.getAllByRole('link').map((link) => link.querySelector('span span')?.textContent);

describe('ExerciseBrowser', () => {
  test('list every exercise by name', async () => {
    await setup();

    expect(await screen.findByText('2 exercises')).toBeInTheDocument();
    expect(names()).toEqual(['Barbell Curl', 'Bench Press']);
  });

  test('filter by muscle group, including secondary muscle groups', async () => {
    const { user } = await setup();
    await screen.findByText('2 exercises');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Muscle group' }), 'Chest');
    expect(await screen.findByText('1 exercise')).toBeInTheDocument();
    expect(names()).toEqual(['Bench Press']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Muscle group' }), 'Biceps');
    expect(await screen.findByText('2 exercises')).toBeInTheDocument();
  });

  test('search by name together with the muscle group filter', async () => {
    const { user } = await setup();
    await screen.findByText('2 exercises');

    await user.type(screen.getByRole('searchbox', { name: 'Search exercises' }), 'curl');
    await waitFor(() => expect(names()).toEqual(['Barbell Curl']));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Muscle group' }), 'Chest');
    expect(await screen.findByText('No exercise found.')).toBeInTheDocument();
  });

  test('show images when the exerciseImages toggle is on', async () => {
    await setup(true);
    const link = await screen.findByRole('link', { name: /Barbell Curl/ });
    expect(link.querySelector('img')).not.toBeNull();
  });

  test('hide images when the exerciseImages toggle is off', async () => {
    await setup(false);
    const link = await screen.findByRole('link', { name: /Barbell Curl/ });
    expect(link.querySelector('img')).toBeNull();
    expect(link).toHaveTextContent('Strength · Barbell');
  });
});
