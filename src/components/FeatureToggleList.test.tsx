import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { DEFAULT_FEATURES } from '@/db/schema';
import { FEATURES } from '@/lib/features';
import FeatureToggleList from './FeatureToggleList';

test('show one switch per feature toggle', () => {
  render(<FeatureToggleList features={DEFAULT_FEATURES} onChange={() => {}} />);

  expect(screen.getAllByRole('switch')).toHaveLength(FEATURES.length);
  expect(screen.getByRole('switch', { name: 'Rest timer' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('switch', { name: 'RPE' })).toHaveAttribute('aria-checked', 'false');
});

test('report all toggles with the tapped one changed', async () => {
  const onChange = vi.fn();
  render(<FeatureToggleList features={DEFAULT_FEATURES} onChange={onChange} />);

  await userEvent.click(screen.getByRole('switch', { name: 'RPE' }));

  expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_FEATURES, rpe: true });
});
