import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import WorkoutExerciseList from './WorkoutExerciseList';

const exercise = { loadType: 'external', tracksReps: true, tracksDuration: false, tracksDistance: false } as const;
const items = [
  { id: 'a', exerciseId: 'x', name: 'Squat', position: 1, ...exercise },
  { id: 'b', exerciseId: 'y', name: 'Row', position: 2, ...exercise },
];

test('show the workout exercises in order', () => {
  render(<WorkoutExerciseList items={items} onMove={vi.fn()} onRemove={vi.fn()} />);

  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    expect.stringContaining('Squat'),
    expect.stringContaining('Row'),
  ]);
});

test('turn off moving the first up and the last down', () => {
  render(<WorkoutExerciseList items={items} onMove={vi.fn()} onRemove={vi.fn()} />);

  expect(screen.getByRole('button', { name: 'Move Squat up' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move Squat down' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Move Row up' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Move Row down' })).toBeDisabled();
});

test('report moves and removals', async () => {
  const user = userEvent.setup();
  const onMove = vi.fn();
  const onRemove = vi.fn();
  render(<WorkoutExerciseList items={items} onMove={onMove} onRemove={onRemove} />);

  await user.click(screen.getByRole('button', { name: 'Move Row up' }));
  await user.click(screen.getByRole('button', { name: 'Remove Squat' }));

  expect(onMove).toHaveBeenCalledWith('b', 'up');
  expect(onRemove).toHaveBeenCalledWith('a');
});
