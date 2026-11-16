import { act, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { exercises } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { addSet, addWorkoutExercise, endWorkout, startWorkout } from '@/db/workouts';
import { backStack } from '@/lib/backStack';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import Home from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('home page', () => {
  test('show the app name, Start workout, the menu and the settings', async () => {
    await renderWithDatabase(<Home />);

    expect(screen.getByRole('heading', { name: 'Gymbuddy' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Start workout' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/calendar');
    expect(screen.queryByRole('link', { name: 'Exercises' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Today' })).not.toBeInTheDocument();
  });

  test('open the menu with the workout history, exercises, routines and saved supersets', async () => {
    const { user } = await renderWithDatabase(<Home />, { settings: { features: { supersets: true, templates: true } } });

    const button = screen.getByRole('button', { name: 'Exercises and routines' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);

    const menu = screen.getByRole('navigation', { name: 'Exercises and routines' });
    expect(within(menu).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Workout history', '/history'],
      ['Statistics', '/statistics'],
      ['Exercises', '/exercises'],
      ['Routines', '/routines'],
      ['Saved supersets', '/saved-supersets'],
    ]);
  });

  test('leave statistics, routines and saved supersets out of the menu when their feature toggles are off', async () => {
    const { user } = await renderWithDatabase(<Home />, {
      settings: { features: { supersets: true, templates: false, statistics: false } },
    });

    await user.click(screen.getByRole('button', { name: 'Exercises and routines' }));

    const menu = screen.getByRole('navigation', { name: 'Exercises and routines' });
    expect(within(menu).getAllByRole('link').map((link) => link.textContent)).toEqual(['Workout history', 'Exercises']);
  });

  test('close the menu with Android Back, a tap outside or a second tap', async () => {
    const { user } = await renderWithDatabase(<Home />);
    const button = screen.getByRole('button', { name: 'Exercises and routines' });

    await user.click(button);
    act(() => {
      backStack.back();
    });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    await user.click(button);
    await user.click(screen.getByRole('heading', { name: 'Gymbuddy' }));
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    await user.click(button);
    await user.click(button);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  test('show the workouts ended today, but not earlier ones', async () => {
    const { db } = await createTestDatabase();
    const { userId } = await getLocalSettings(db);
    const exerciseId = crypto.randomUUID();
    await db.insert(exercises).values({ id: exerciseId, userId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external', tracksReps: true });
    const today = new Date();
    today.setHours(0, 1);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    for (const startedAt of [yesterday, today]) {
      const workout = await startWorkout(db, userId, startedAt);
      await addSet(db, await addWorkoutExercise(db, workout.id, exerciseId), { setType: 'normal', weightGrams: 100000, reps: 5, durationSeconds: null, distanceMeters: null, rpe: null, notes: null });
      await endWorkout(db, workout.id, new Date(startedAt.getTime() + 45 * 60 * 1000));
    }

    await renderWithDatabase(<Home />, { db });

    const todaySection = await screen.findByRole('region', { name: 'Today' });
    const links = within(todaySection).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('45 min · 1 set');
    expect(links[0]).toHaveTextContent('Squat');
  });
});
