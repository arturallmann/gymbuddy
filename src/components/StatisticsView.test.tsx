import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { addBodyweight, listBodyweights } from '@/db/bodyweights';
import { getLocalSettings } from '@/db/settings';
import { addSet, addWorkoutExercise, endWorkout, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import StatisticsView from './StatisticsView';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const values = (weightGrams: number, reps: number) => ({
  setType: 'normal' as const,
  weightGrams,
  reps,
  durationSeconds: null,
  distanceMeters: null,
  rpe: null,
  notes: null,
});

beforeEach(() => {
  // Today is Sunday 15 November 2026.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 15, 12, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const { press, curl } = await addTestLibrary(db);
  const workout = async (startedAt: Date, sets: [string, number, number][]) => {
    const started = await startWorkout(db, userId, startedAt);
    for (const [exerciseId, weight, reps] of sets) {
      await addSet(db, await addWorkoutExercise(db, started.id, exerciseId), values(weight, reps));
    }
    await endWorkout(db, started.id);
  };
  await workout(new Date(2026, 10, 10, 18), [
    [press, 100000, 5],
    [curl, 20000, 10],
  ]);
  await workout(new Date(2026, 10, 12, 18), [[press, 100000, 3]]);
  // Two months ago: only in the 3 months span.
  await workout(new Date(2026, 8, 20, 18), [[curl, 15000, 10]]);
  const rendered = await renderWithDatabase(<StatisticsView />, { db });
  return { ...rendered, userId };
}

const tile = (label: string) => screen.getByText(label, { selector: 'dt' }).nextSibling;

describe('StatisticsView', () => {
  test('sum up the workouts of the last 4 weeks, and of 3 months', async () => {
    const { user } = await setup();

    expect(await screen.findByRole('img', { name: 'Volume per week' })).toBeInTheDocument();
    expect(tile('Workouts')).toHaveTextContent('2');
    expect(tile('Per week')).toHaveTextContent('0.5');
    expect(tile('Sets')).toHaveTextContent('3');
    // 100 × 5 + 20 × 10 + 100 × 3
    expect(tile('Volume')).toHaveTextContent('1000 kg');

    await user.click(screen.getByRole('radio', { name: '3 months' }));
    expect(await screen.findByText('3', { selector: 'dd' })).toBeInTheDocument();
    expect(tile('Workouts')).toHaveTextContent('3');
  });

  test('list the exercises with their top value, most workouts first', async () => {
    const { user } = await setup();

    await user.click(await screen.findByRole('tab', { name: 'Exercises' }));

    await screen.findByText('Bench Press');
    const links = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/exercises/detail'));
    expect(links.map((link) => link.textContent)).toEqual([
      'Bench Press2 workouts · 2 sets · 800 kge1RM: 116.65 kg',
      'Barbell Curl1 workout · 1 set · 200 kge1RM: 26.65 kg',
    ]);
  });

  test('count sets per muscle group, secondary as half', async () => {
    const { user } = await setup();

    await user.click(await screen.findByRole('tab', { name: 'Muscle groups' }));

    const items = await screen.findAllByRole('listitem');
    // Chest: 2 bench sets. Biceps: 1 curl set + 2 bench sets × ½.
    expect(items.map((item) => within(item).getAllByText(/sets? ·/)[0].textContent)).toEqual([
      '2 sets · 0.5 per week',
      '2 sets · 0.5 per week',
    ]);
    expect(items[0]).toHaveTextContent('Biceps');
  });

  test('add a bodyweight on the bodyweight tab and delete one', async () => {
    const { user, db, userId } = await setup();
    await addBodyweight(db, userId, 90000, new Date(2026, 10, 1));

    await user.click(await screen.findByRole('tab', { name: 'Bodyweight' }));
    await user.type(await screen.findByLabelText('New bodyweight (kg)'), '81');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const list = await screen.findByRole('list', { name: 'Bodyweights' });
    await within(list).findByText('81 kg');
    expect(screen.getByRole('img', { name: 'Bodyweight over time' })).toBeInTheDocument();
    await user.click(within(list).getAllByRole('button')[1]);

    await vi.waitFor(async () => expect((await listBodyweights(db, userId)).map((b) => b.weightGrams)).toEqual([81000]));
  });

  test('say when the time span has no workouts', async () => {
    const { db } = await createTestDatabase();
    await renderWithDatabase(<StatisticsView />, { db });

    expect(await screen.findByText('No workouts in this time span.')).toBeInTheDocument();
  });
});
