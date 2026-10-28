import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import PresetPicker from './PresetPicker';

test('show the three presets with descriptions', () => {
  render(<PresetPicker value="standard" onChange={() => {}} />);

  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(screen.getByRole('radio', { name: /Standard/ })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByText(/Everything, including RPE/)).toBeInTheDocument();
});

test('report the preset the user taps', async () => {
  const onChange = vi.fn();
  render(<PresetPicker value="standard" onChange={onChange} />);

  await userEvent.click(screen.getByRole('radio', { name: /Simple/ }));

  expect(onChange).toHaveBeenCalledWith('simple');
});
