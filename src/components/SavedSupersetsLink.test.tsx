import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithDatabase } from '@/testing/render';
import SavedSupersetsLink from './SavedSupersetsLink';

test('show the link when supersets and templates are both on', async () => {
  await renderWithDatabase(<SavedSupersetsLink />, { settings: { features: { supersets: true, templates: true } } });
  expect(screen.getByRole('link', { name: 'Saved supersets' })).toHaveAttribute('href', '/saved-supersets');
});

test('hide the link when either toggle is off', async () => {
  await renderWithDatabase(<SavedSupersetsLink />, { settings: { features: { supersets: true, templates: false } } });
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
