import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import DiscardWorkout from './DiscardWorkout';

test('ask before it discards the workout', async () => {
  const user = userEvent.setup();
  const onDiscard = vi.fn().mockResolvedValue(undefined);
  render(<DiscardWorkout onDiscard={onDiscard} />);

  await user.click(screen.getByRole('button', { name: 'Discard workout' }));
  expect(screen.getByText(/Its exercises and sets are deleted/)).toBeInTheDocument();
  expect(onDiscard).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Discard' }));
  expect(onDiscard).toHaveBeenCalledOnce();
});

test('keep the workout when the user changes their mind', async () => {
  const user = userEvent.setup();
  const onDiscard = vi.fn();
  render(<DiscardWorkout onDiscard={onDiscard} />);

  await user.click(screen.getByRole('button', { name: 'Discard workout' }));
  await user.click(screen.getByRole('button', { name: 'Keep workout' }));

  expect(onDiscard).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Discard workout' })).toBeInTheDocument();
});
