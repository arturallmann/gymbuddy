import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import CategoryFilter from './CategoryFilter';

test('mark the chosen category and report a new choice', async () => {
  const onChange = vi.fn();
  render(<CategoryFilter value="stretch" onChange={onChange} />);

  expect(screen.getByRole('radio', { name: 'Stretch' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'false');
  await userEvent.click(screen.getByRole('radio', { name: 'All' }));
  await userEvent.click(screen.getByRole('radio', { name: 'Cardio' }));

  expect(onChange.mock.calls).toEqual([[null], ['cardio']]);
});
