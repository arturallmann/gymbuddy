import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import OptionGroup from './OptionGroup';

const options = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
] as const;

test('mark the chosen option', () => {
  render(<OptionGroup label="Weight unit" options={[...options]} value="lb" onChange={() => {}} />);

  expect(screen.getByRole('radiogroup', { name: 'Weight unit' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'lb' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('radio', { name: 'kg' })).toHaveAttribute('aria-checked', 'false');
});

test('report the option the user taps', async () => {
  const onChange = vi.fn();
  render(<OptionGroup label="Weight unit" options={[...options]} value="kg" onChange={onChange} />);

  await userEvent.click(screen.getByRole('radio', { name: 'lb' }));

  expect(onChange).toHaveBeenCalledWith('lb');
});
