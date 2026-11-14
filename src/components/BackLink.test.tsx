import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import BackLink from './BackLink';

test('show only an arrow, named for screen readers, linked to the page before', () => {
  render(<BackLink href="/workout" label="Back to workout" />);

  const link = screen.getByRole('link', { name: 'Back to workout' });
  expect(link).toHaveAttribute('href', '/workout');
  expect(link).toHaveTextContent('');
});
