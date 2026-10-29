import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import ElapsedTime from './ElapsedTime';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-29T10:01:05Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

test('show the time since the start and count up', () => {
  render(<ElapsedTime since={new Date('2026-10-29T10:00:00Z')} />);
  expect(screen.getByText('1:05')).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(screen.getByText('1:06')).toBeInTheDocument();
});

test('show hours after one hour', () => {
  render(<ElapsedTime since={new Date('2026-10-29T08:59:00Z')} />);
  expect(screen.getByText('1:02:05')).toBeInTheDocument();
});
