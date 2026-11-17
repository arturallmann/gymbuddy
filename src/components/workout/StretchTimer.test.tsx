import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import StretchTimer from './StretchTimer';

const native = vi.hoisted(() => ({ signalTimerDone: vi.fn() }));
vi.mock('@/native/alert', () => ({ signalTimerDone: native.signalTimerDone }));

beforeEach(() => {
  vi.useFakeTimers();
  native.signalTimerDone.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
});

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('StretchTimer', () => {
  test('count down, signal at zero, then log a set with the timer length', async () => {
    const onLog = vi.fn().mockResolvedValue(undefined);
    render(<StretchTimer initialSeconds={30} onLog={onLog} />);
    expect(screen.getByRole('timer')).toHaveTextContent('0:30');

    click('Start');
    advance(10_000);
    expect(screen.getByRole('timer')).toHaveTextContent('0:20');
    expect(native.signalTimerDone).not.toHaveBeenCalled();

    advance(20_000);
    expect(screen.getByRole('status')).toHaveTextContent('Done');
    expect(native.signalTimerDone).toHaveBeenCalledOnce();

    await act(async () => click('Log set (0:30)'));
    expect(onLog).toHaveBeenCalledWith(30);
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  test('pause and resume without losing time', () => {
    render(<StretchTimer initialSeconds={30} onLog={vi.fn()} />);

    click('Start');
    advance(5_000);
    click('Pause');
    advance(60_000);
    expect(screen.getByRole('timer')).toHaveTextContent('0:25');

    click('Resume');
    advance(5_000);
    expect(screen.getByRole('timer')).toHaveTextContent('0:20');
  });

  test('change the length in 15 second steps before the start, and reset', () => {
    render(<StretchTimer initialSeconds={30} onLog={vi.fn()} />);

    click('15 seconds more');
    click('15 seconds more');
    expect(screen.getByRole('timer')).toHaveTextContent('1:00');
    click('15 seconds less');
    expect(screen.getByRole('timer')).toHaveTextContent('0:45');

    click('Start');
    advance(10_000);
    click('Reset');
    expect(screen.getByRole('timer')).toHaveTextContent('0:45');
  });
});
