import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import type { ChartPoint, Metric } from '@/lib/progress';
import ExerciseChart from './ExerciseChart';

const kg = { weightUnit: 'kg', distanceUnit: 'metric' } as const;
const data: Record<Metric, ChartPoint[]> = {
  weight: [
    { workoutId: 'w1', startedAt: new Date(2026, 9, 1), value: 60000 },
    { workoutId: 'w2', startedAt: new Date(2026, 9, 8), value: 65000 },
  ],
  reps: [{ workoutId: 'w1', startedAt: new Date(2026, 9, 1), value: 8 }],
  volume: [],
  duration: [],
  distance: [],
};

test('chart the first value, show the latest point, and list all values', () => {
  render(<ExerciseChart metrics={['weight', 'reps']} pointsFor={(metric) => data[metric]} units={kg} />);

  expect(screen.getByRole('img', { name: 'Heaviest weight per workout' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('65 kg');
  const rows = within(screen.getByRole('table')).getAllByRole('row');
  expect(rows.map((row) => row.lastChild?.textContent)).toEqual(['60 kg', '65 kg']);
});

test('switch to another value', async () => {
  const user = userEvent.setup();
  render(<ExerciseChart metrics={['weight', 'reps']} pointsFor={(metric) => data[metric]} units={kg} />);

  await user.click(screen.getByRole('button', { name: 'Most reps' }));

  expect(screen.getByRole('button', { name: 'Most reps' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('img', { name: 'Most reps per workout' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('8');
});

test('show the value of a tapped point', () => {
  const { container } = render(<ExerciseChart metrics={['weight']} pointsFor={(metric) => data[metric]} units={kg} />);

  fireEvent.click(container.querySelectorAll('circle')[0]);

  expect(screen.getByRole('status')).toHaveTextContent('60 kg');
});

test('say so when there is nothing to chart', () => {
  render(<ExerciseChart metrics={['duration']} pointsFor={(metric) => data[metric]} units={kg} />);
  expect(screen.getByText('No values to chart yet.')).toBeInTheDocument();
});
