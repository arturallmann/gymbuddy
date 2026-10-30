import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import ConfirmAction from './ConfirmAction';

function renderAction(onConfirm = vi.fn().mockResolvedValue(undefined)) {
  render(
    <ConfirmAction
      label="Discard workout"
      question="Discard this workout? Its exercises and sets are deleted."
      confirmLabel="Discard"
      keepLabel="Keep workout"
      onConfirm={onConfirm}
    />,
  );
  return { user: userEvent.setup(), onConfirm };
}

test('ask before it runs the action', async () => {
  const { user, onConfirm } = renderAction();

  await user.click(screen.getByRole('button', { name: 'Discard workout' }));
  expect(screen.getByText(/Its exercises and sets are deleted/)).toBeInTheDocument();
  expect(onConfirm).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Discard' }));
  expect(onConfirm).toHaveBeenCalledOnce();
});

test('do nothing when the user changes their mind', async () => {
  const { user, onConfirm } = renderAction();

  await user.click(screen.getByRole('button', { name: 'Discard workout' }));
  await user.click(screen.getByRole('button', { name: 'Keep workout' }));

  expect(onConfirm).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Discard workout' })).toBeInTheDocument();
});
