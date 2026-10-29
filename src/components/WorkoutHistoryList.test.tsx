import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import WorkoutHistoryList from './WorkoutHistoryList';

const workout = {
  id: 'w1',
  startedAt: new Date(2026, 9, 29, 9, 0),
  endedAt: new Date(2026, 9, 29, 10, 5),
  exerciseNames: ['Squat', 'Row'],
  setCount: 6,
};

test('show date, duration, number of sets and exercises, linked to the detail page', () => {
  render(<WorkoutHistoryList items={[workout, { ...workout, id: 'w2', setCount: 1, exerciseNames: [] }]} />);

  const [first, second] = screen.getAllByRole('link');
  expect(first).toHaveAttribute('href', '/history/workout?id=w1');
  expect(first).toHaveTextContent('2026');
  expect(first).toHaveTextContent('1 h 5 min · 6 sets');
  expect(first).toHaveTextContent('Squat, Row');
  expect(second).toHaveTextContent('1 h 5 min · 1 set');
});

test('say so without workouts', () => {
  render(<WorkoutHistoryList items={[]} />);

  expect(screen.getByText('No workouts yet.')).toBeInTheDocument();
});
