import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import Home from './page';

test('link to the settings', () => {
  render(<Home />);

  expect(screen.getByRole('heading', { name: 'Gymbuddy' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
});
