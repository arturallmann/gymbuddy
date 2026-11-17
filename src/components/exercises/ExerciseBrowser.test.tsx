import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { exercises } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import ExerciseBrowser from './ExerciseBrowser';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => navigation.params }));

beforeEach(() => {
  navigation.params = new URLSearchParams();
  window.history.replaceState(null, '', '/exercises');
});

async function setup(exerciseImages = true, withCustomStretch = false) {
  const { db } = await createTestDatabase();
  await addTestLibrary(db);
  if (withCustomStretch) {
    const { userId } = await getLocalSettings(db);
    await db.insert(exercises).values({ userId, source: 'custom', name: 'Couch Stretch', category: 'stretch', loadType: 'none', tracksDuration: true });
  }
  return renderWithDatabase(<ExerciseBrowser />, { db, settings: { features: { exerciseImages } } });
}

const names = () =>
  screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('href')?.startsWith('/exercises/detail'))
    .map((link) => link.querySelector('span span')?.textContent);

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

  test('link to a new custom exercise', async () => {
    await setup();

    expect(await screen.findByRole('link', { name: 'New custom exercise' })).toHaveAttribute('href', '/exercises/edit');
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

  test('keep the filters in the address and give it to each exercise page as back', async () => {
    const { user } = await setup();
    await screen.findByText('2 exercises');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Muscle group' }), 'Chest');
    expect(await screen.findByText('1 exercise')).toBeInTheDocument();
    const address = `${window.location.pathname}${window.location.search}`;
    expect(address).toMatch(/^\/exercises\?muscle=/);
    expect(screen.getByRole('link', { name: /Bench Press/ })).toHaveAttribute(
      'href',
      expect.stringMatching(new RegExp(`&back=${encodeURIComponent(address).replace(/[?]/g, '\\?')}$`)),
    );
  });

  test('start with the filters from the address', async () => {
    navigation.params = new URLSearchParams({ q: 'curl', category: 'strength' });
    await setup();

    expect(await screen.findByText('1 exercise')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search exercises' })).toHaveValue('curl');
    expect(screen.getByRole('radio', { name: 'Strength' })).toBeChecked();
  });

  test('filter by category', async () => {
    const { user } = await setup(true, true);
    await screen.findByText('3 exercises');

    await user.click(screen.getByRole('radio', { name: 'Stretch' }));

    expect(await screen.findByText('1 exercise')).toBeInTheDocument();
    expect(names()).toEqual(['Couch Stretch']);
  });

  test('show only custom exercises, together with the other filters', async () => {
    const { user } = await setup(true, true);
    await screen.findByText('3 exercises');

    await user.click(screen.getByRole('button', { name: 'Custom only' }));
    expect(await screen.findByText('1 exercise')).toBeInTheDocument();
    expect(names()).toEqual(['Couch Stretch']);
    expect(screen.getByRole('button', { name: 'Custom only' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('radio', { name: 'Strength' }));
    expect(await screen.findByText('No exercise found.')).toBeInTheDocument();
  });
});
