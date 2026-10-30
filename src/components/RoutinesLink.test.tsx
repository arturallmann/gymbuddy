import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithDatabase } from '@/testing/render';
import RoutinesLink from './RoutinesLink';

test('show the link when templates are on', async () => {
  await renderWithDatabase(<RoutinesLink />, { settings: { features: { templates: true } } });
  expect(screen.getByRole('link', { name: 'Routines' })).toHaveAttribute('href', '/routines');
});

test('hide the link when templates are off', async () => {
  await renderWithDatabase(<RoutinesLink />, { settings: { features: { templates: false } } });
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
