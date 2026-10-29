import { screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { renderWithDatabase } from '@/testing/render';
import Home from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

test('offer to start a workout and link to the workout history and the settings', async () => {
  await renderWithDatabase(<Home />);

  expect(screen.getByRole('heading', { name: 'Gymbuddy' })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Start workout' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Workout history' })).toHaveAttribute('href', '/history');
  expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
});
