import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderWithDatabase } from '@/testing/render';
import SetupGate from './SetupGate';

const navigation = vi.hoisted(() => ({ pathname: '/', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
}));

beforeEach(() => {
  navigation.replace.mockReset();
});

describe('SetupGate', () => {
  test('send a new user to first-time setup', async () => {
    navigation.pathname = '/';
    await renderWithDatabase(<SetupGate>Home page</SetupGate>);

    expect(navigation.replace).toHaveBeenCalledWith('/setup');
    expect(screen.queryByText('Home page')).not.toBeInTheDocument();
  });

  test('show first-time setup to a new user', async () => {
    navigation.pathname = '/setup';
    await renderWithDatabase(<SetupGate>Setup page</SetupGate>);

    expect(screen.getByText('Setup page')).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  test('show pages after setup is done', async () => {
    navigation.pathname = '/settings';
    await renderWithDatabase(<SetupGate>Settings page</SetupGate>, {
      settings: { setupCompletedAt: new Date() },
    });

    expect(screen.getByText('Settings page')).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  test('never show setup again after it is done', async () => {
    navigation.pathname = '/setup';
    await renderWithDatabase(<SetupGate>Setup page</SetupGate>, {
      settings: { setupCompletedAt: new Date() },
    });

    expect(navigation.replace).toHaveBeenCalledWith('/');
    expect(screen.queryByText('Setup page')).not.toBeInTheDocument();
  });
});
