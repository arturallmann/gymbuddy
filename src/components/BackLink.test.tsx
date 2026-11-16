import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { backStack } from '@/lib/backStack';
import BackLink from './BackLink';

const navigation = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
vi.mock('next/navigation', () => ({ useRouter: () => navigation.router }));

beforeEach(() => {
  navigation.push.mockReset();
});

test('show only an arrow, named for screen readers, linked to the page before', () => {
  render(<BackLink href="/workout" label="Back to workout" />);

  const link = screen.getByRole('link', { name: 'Back to workout' });
  expect(link).toHaveAttribute('href', '/workout');
  expect(link).toHaveTextContent('');
});

test('let Android Back go to the same page while it is shown', () => {
  const { unmount } = render(<BackLink href="/workout" label="Back to workout" />);

  expect(backStack.back()).toBe(true);
  expect(navigation.push).toHaveBeenCalledWith('/workout');

  unmount();
  expect(backStack.back()).toBe(false);
});
