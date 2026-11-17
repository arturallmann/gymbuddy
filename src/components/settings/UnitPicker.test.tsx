import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import UnitPicker from './UnitPicker';

test('show the chosen units', () => {
  render(<UnitPicker units={{ weightUnit: 'lb', distanceUnit: 'metric' }} onChange={() => {}} />);

  expect(screen.getByRole('radio', { name: 'lb' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('radio', { name: 'Metric (m, km)' })).toHaveAttribute('aria-checked', 'true');
});

test('report only the unit that changed', async () => {
  const onChange = vi.fn();
  render(<UnitPicker units={{ weightUnit: 'kg', distanceUnit: 'metric' }} onChange={onChange} />);

  await userEvent.click(screen.getByRole('radio', { name: 'Imperial (ft, mi)' }));

  expect(onChange).toHaveBeenCalledWith({ distanceUnit: 'imperial' });
});
