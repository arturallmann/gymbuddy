import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import RestTimer from './RestTimer';

const native = vi.hoisted(() => ({ signalTimerDone: vi.fn() }));
vi.mock('@/native/alert', () => ({ signalTimerDone: native.signalTimerDone }));

beforeEach(() => {
  vi.useFakeTimers();
  native.signalTimerDone.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
});

test('count the rest down, signal once at zero, then offer the next round', () => {
  const onClose = vi.fn();
  render(<RestTimer seconds={90} onClose={onClose} />);
  expect(screen.getByRole('timer')).toHaveTextContent('1:30');

  act(() => vi.advanceTimersByTime(60_000));
  expect(screen.getByRole('timer')).toHaveTextContent('0:30');
  expect(native.signalTimerDone).not.toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(40_000));
  expect(screen.getByRole('status')).toHaveTextContent('Rest is over');
  expect(native.signalTimerDone).toHaveBeenCalledOnce();

  fireEvent.click(screen.getByRole('button', { name: 'Next round' }));
  expect(onClose).toHaveBeenCalledOnce();
});

test('skip the rest', () => {
  const onClose = vi.fn();
  render(<RestTimer seconds={90} onClose={onClose} />);

  fireEvent.click(screen.getByRole('button', { name: 'Skip rest' }));

  expect(onClose).toHaveBeenCalledOnce();
  expect(native.signalTimerDone).not.toHaveBeenCalled();
});
