import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import SaveTemplate from './SaveTemplate';

test('suggest the default name, save it and confirm with a link to the list', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<SaveTemplate label="Save superset" defaultName="Curl + Press" listHref="/saved-supersets" listLabel="Saved supersets" onSave={onSave} />);

  await user.click(screen.getByRole('button', { name: 'Save superset' }));
  const name = screen.getByRole('textbox', { name: 'Name' });
  expect(name).toHaveValue('Curl + Press');
  await user.clear(name);
  await user.type(name, 'Arm day finisher');
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(onSave).toHaveBeenCalledWith('Arm day finisher');
  expect(screen.getByRole('status')).toHaveTextContent('Saved as “Arm day finisher”.');
  expect(screen.getByRole('link', { name: 'Saved supersets' })).toHaveAttribute('href', '/saved-supersets');
});

test('refuse an empty name and cancel without saving', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(<SaveTemplate label="Save superset" defaultName="Curl + Press" listHref="/saved-supersets" listLabel="Saved supersets" onSave={onSave} />);

  await user.click(screen.getByRole('button', { name: 'Save superset' }));
  await user.clear(screen.getByRole('textbox', { name: 'Name' }));
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Save superset' })).toBeInTheDocument();
});
