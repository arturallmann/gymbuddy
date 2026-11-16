import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import NumberStepper from './NumberStepper';

test('type a value, or step it with − and +, keeping the label on the input', async () => {
  const onChange = vi.fn();
  const onStep = vi.fn();
  render(<NumberStepper label="Reps" value="5" onChange={onChange} onStep={onStep} inputMode="numeric" lessLabel="One rep less" moreLabel="One rep more" />);

  await userEvent.type(screen.getByRole('textbox', { name: 'Reps' }), '0');
  await userEvent.click(screen.getByRole('button', { name: 'One rep less' }));
  await userEvent.click(screen.getByRole('button', { name: 'One rep more' }));

  expect(onChange).toHaveBeenCalledWith('50');
  expect(onStep.mock.calls).toEqual([[-1], [1]]);
});
