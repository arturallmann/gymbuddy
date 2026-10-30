import { render, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import type { WorkoutSet } from '@/db/schema';
import ExerciseHistory from './ExerciseHistory';

const set = (reps: number, notes: string | null = null) =>
  ({ id: crypto.randomUUID(), setType: 'normal', weightGrams: 60000, reps, durationSeconds: null, distanceMeters: null, rpe: null, notes }) as WorkoutSet;
const kg = { weightUnit: 'kg', distanceUnit: 'metric' } as const;

test('show workouts newest first, linked to their detail page, with sets and notes', () => {
  render(
    <ExerciseHistory
      workouts={[
        { workoutId: 'w2', startedAt: new Date(2026, 9, 20), items: [{ workoutExerciseId: 'a', notes: 'Old rack', sets: [set(5, 'belt')] }] },
        { workoutId: 'w1', startedAt: new Date(2026, 9, 1), items: [{ workoutExerciseId: 'b', notes: null, sets: [set(8), set(6)] }] },
      ]}
      loadType="external"
      units={kg}
    />,
  );

  const [newer, older] = within(screen.getByRole('list', { name: 'History' })).getAllByRole('listitem').filter((item) => item.parentElement?.getAttribute('aria-label') === 'History');
  expect(within(newer).getByRole('link')).toHaveAttribute('href', '/history/workout?id=w2');
  expect(newer).toHaveTextContent('Old rack');
  expect(newer).toHaveTextContent('60 kg × 5');
  expect(newer).toHaveTextContent('belt');
  expect(within(older).getAllByRole('listitem')).toHaveLength(2);
});

test('say so without sets', () => {
  render(<ExerciseHistory workouts={[]} loadType="external" units={kg} />);
  expect(screen.getByText('No sets yet.')).toBeInTheDocument();
});
