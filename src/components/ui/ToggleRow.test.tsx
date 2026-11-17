import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import ToggleRow from './ToggleRow';

test('show the label, description and state', () => {
  render(<ToggleRow label="RPE" description="Rate each set." checked onChange={() => {}} />);

  expect(screen.getByText('Rate each set.')).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'RPE' })).toHaveAttribute('aria-checked', 'true');
});

test('report the new state when tapped', async () => {
  const onChange = vi.fn();
  render(<ToggleRow label="RPE" description="Rate each set." checked={false} onChange={onChange} />);

  await userEvent.click(screen.getByRole('switch', { name: 'RPE' }));

  expect(onChange).toHaveBeenCalledWith(true);
});
