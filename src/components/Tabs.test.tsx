import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Tabs, { tabPanelProps } from './Tabs';

test('mark the chosen tab, report a tap, and connect the panel to its tab', async () => {
  const onChange = vi.fn();
  render(
    <>
      <Tabs label="Exercise" tabs={[{ value: 'log', label: 'Log' }, { value: 'about', label: 'About' }]} value="log" onChange={onChange} />
      <div {...tabPanelProps('log')}>Sets</div>
    </>,
  );

  expect(screen.getByRole('tablist', { name: 'Exercise' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Log' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel', { name: 'Log' })).toHaveTextContent('Sets');
  await userEvent.click(screen.getByRole('tab', { name: 'About' }));
  expect(onChange).toHaveBeenCalledWith('about');
});
