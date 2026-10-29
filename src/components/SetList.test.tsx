import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { WorkoutSet } from '@/db/schema';
import SetList from './SetList';

const base: WorkoutSet = {
  id: 'a',
  workoutExerciseId: 'w',
  position: 1,
  setType: 'normal',
  weightGrams: 60000,
  reps: 8,
  durationSeconds: null,
  distanceMeters: null,
  rpe: null,
  restSeconds: null,
  notes: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

test('show each set with its values and notes', () => {
  render(
    <SetList
      sets={[base, { ...base, id: 'b', position: 2, rpe: 9, setType: 'failure', notes: 'last rep slow' }]}
      loadType="external"
      units={{ weightUnit: 'kg', distanceUnit: 'metric' }}
      onRemove={vi.fn()}
    />,
  );

  const items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveTextContent('60 kg × 8');
  expect(items[1]).toHaveTextContent('60 kg × 8 · RPE 9 · Failure set');
  expect(items[1]).toHaveTextContent('last rep slow');
});

test('remove a set', async () => {
  const user = userEvent.setup();
  const onRemove = vi.fn();
  render(<SetList sets={[base]} loadType="external" units={{ weightUnit: 'kg', distanceUnit: 'metric' }} onRemove={onRemove} />);

  await user.click(screen.getByRole('button', { name: 'Remove set 1' }));

  expect(onRemove).toHaveBeenCalledWith('a');
});
