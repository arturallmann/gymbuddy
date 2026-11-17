import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { exercises } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { addSet } from '@/db/sets';
import { addWorkoutExercise } from '@/db/workoutExercises';
import { endWorkout, startWorkout } from '@/db/workouts';
import { backStack } from '@/lib/backStack';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import CalendarView from './CalendarView';

const navigation = vi.hoisted(() => {
  const replace = vi.fn();
  return { params: new URLSearchParams(), replace, router: { replace, push: vi.fn() } };
});
vi.mock('next/navigation', () => ({ useSearchParams: () => navigation.params, useRouter: () => navigation.router }));

const values = { setType: 'normal' as const, weightGrams: 60000, reps: 8, durationSeconds: null, distanceMeters: null, rpe: null, notes: null };

beforeEach(() => {
  // Today is Sunday 15 November 2026, and weeks start on Monday (en-GB).
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 15, 12, 0));
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB');
  navigation.params = new URLSearchParams();
  navigation.replace.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Workouts: Wed 4 Nov (squat and a stretch), Mon 9 Nov (squat), and Tue 27 Oct (squat).
async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const squat = crypto.randomUUID();
  const stretch = crypto.randomUUID();
  await db.insert(exercises).values([
    { id: squat, userId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external', tracksReps: true },
    { id: stretch, userId, source: 'custom', name: 'Couch Stretch', category: 'stretch', loadType: 'none', tracksDuration: true },
  ]);
  const ids: Record<string, string> = {};
  for (const [name, start, ex] of [
    ['nov4', new Date(2026, 10, 4, 18, 5), [squat, stretch]],
    ['nov9', new Date(2026, 10, 9, 7, 0), [squat]],
    ['oct27', new Date(2026, 9, 27, 7, 0), [squat]],
  ] as const) {
    const workout = await startWorkout(db, userId, start);
    for (const exerciseId of ex) {
      const workoutExercise = await addWorkoutExercise(db, workout.id, exerciseId);
      await addSet(db, workoutExercise, values);
      await addSet(db, workoutExercise, values);
    }
    await endWorkout(db, workout.id, new Date(start.getTime() + 45 * 60 * 1000));
    ids[name] = workout.id;
  }
  const rendered = await renderWithDatabase(<CalendarView />, { db });
  return { ...rendered, ids };
}

const cell = (name: RegExp) => screen.findByRole('gridcell', { name });

describe('month view', () => {
  beforeEach(() => {
    navigation.params = new URLSearchParams({ view: 'month' });
  });

  test('mark today and the days with workouts, with a bar per category', async () => {
    await setup();

    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(await cell(/^Sunday 15 November, today$/)).toBeInTheDocument();
    const nov4 = await cell(/^Wednesday 4 November, 1 workout$/);
    expect([...nov4.querySelectorAll('[data-category]')].map((bar) => bar.getAttribute('data-category'))).toEqual(['strength', 'stretch']);
    expect(nov4.tagName).toBe('BUTTON');
    expect((await cell(/^Thursday 5 November$/)).tagName).toBe('SPAN');
    // The grid starts on Monday 26 October and shows its workouts too.
    expect(await cell(/^Tuesday 27 October, 1 workout$/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
  });

  test('open a day to list its workouts, linked back to this place; close it again or with Android Back', async () => {
    const { user, ids } = await setup();

    await user.click(await cell(/^Wednesday 4 November, 1 workout$/));
    const day = screen.getByRole('region', { name: 'Wednesday 4 November' });
    const link = within(day).getByRole('link');
    expect(link).toHaveTextContent('45 min · 4 sets');
    expect(link).toHaveTextContent('Squat ×2, Couch Stretch ×2');
    expect(link).toHaveAttribute(
      'href',
      `/history/workout?id=${ids.nov4}&back=${encodeURIComponent('/calendar?view=month&date=2026-11-15&day=2026-11-04')}`,
    );
    expect(navigation.replace).toHaveBeenLastCalledWith('/calendar?view=month&date=2026-11-15&day=2026-11-04');

    await user.click(await cell(/^Wednesday 4 November, 1 workout$/));
    expect(screen.queryByRole('region', { name: 'Wednesday 4 November' })).not.toBeInTheDocument();

    await user.click(await cell(/^Monday 9 November, 1 workout$/));
    act(() => {
      backStack.back();
    });
    expect(screen.queryByRole('region', { name: 'Monday 9 November' })).not.toBeInTheDocument();
  });

  test('go to other months with the arrows, a swipe and Today', async () => {
    const { user } = await setup();
    await cell(/^Wednesday 4 November, 1 workout$/);

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('December 2026')).toBeInTheDocument();
    expect(navigation.replace).toHaveBeenLastCalledWith('/calendar?view=month&date=2026-12-01');
    // The next month slides in from the right, the one before from the left (decision 045).
    expect(screen.getByRole('grid').parentElement).toHaveClass('slide-from-right');

    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.getByRole('grid').parentElement).toHaveClass('slide-from-left');

    const area = screen.getByRole('grid').parentElement!;
    fireEvent.touchStart(area, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchEnd(area, { changedTouches: [{ clientX: 100, clientY: 110 }] });
    expect(screen.getByText('December 2026')).toBeInTheDocument();
    fireEvent.touchStart(area, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(area, { changedTouches: [{ clientX: 130, clientY: 300 }] });
    expect(screen.getByText('December 2026')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(await cell(/^Tuesday 27 October, 1 workout$/)).toBeInTheDocument();
  });
});

describe('week view', () => {
  test('open on the current week without a place in the address', async () => {
    await setup();

    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/^9\s?–\s?15 Nov 2026$/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
  });

  test('list the seven days, with rest days, and open a day in place', async () => {
    const { user } = await setup();

    await user.click(screen.getByRole('radio', { name: 'Week' }));

    expect(screen.getByText(/^9\s?–\s?15 Nov 2026$/)).toBeInTheDocument();
    const nov9 = await screen.findByRole('button', { name: 'Monday 9 November, 1 workout' });
    expect(nov9).toHaveTextContent('Squat');
    expect(screen.getByRole('button', { name: 'Sunday 15 November, today' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tuesday 10 November' })).toHaveTextContent('Rest day');
    // No "Rest day" for days still to come.
    await user.click(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.getByRole('button', { name: 'Monday 16 November' })).not.toHaveTextContent('Rest day');
    await user.click(screen.getByRole('button', { name: 'Previous week' }));

    const again = await screen.findByRole('button', { name: 'Monday 9 November, 1 workout' });
    await user.click(again);
    expect(screen.getByRole('button', { name: 'Monday 9 November, 1 workout' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /45 min · 2 sets/ })).toBeInTheDocument();
  });

  test('start at the place in the address', async () => {
    navigation.params = new URLSearchParams({ view: 'week', date: '2026-11-04', day: '2026-11-04' });
    await setup();

    expect(screen.getByText(/^2\s?–\s?8 Nov 2026$/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Wednesday 4 November, 1 workout' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });
});
