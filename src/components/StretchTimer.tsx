'use client';

import { useEffect, useRef, useState } from 'react';
import { useNow } from '@/hooks/useNow';
import { remainingSeconds, stepDuration } from '@/lib/timer';
import { formatDuration } from '@/lib/units';
import { signalTimerDone } from '@/native/alert';

type Props = {
  // The length to start with, such as the exercise's default duration.
  initialSeconds: number;
  // Logs a set with the timer length as its duration.
  onLog: (seconds: number) => Promise<void>;
};

type State =
  | { status: 'idle' }
  | { status: 'running'; endsAt: number }
  | { status: 'paused'; left: number }
  | { status: 'done' };

// Counts a stretch down. At zero the phone vibrates and plays a tone, and the user can log the set.
export default function StretchTimer({ initialSeconds, onLog }: Props) {
  const [length, setLength] = useState(initialSeconds);
  const [state, setState] = useState<State>({ status: 'idle' });
  const now = useNow(250).getTime();
  const signalled = useRef(false);

  const left =
    state.status === 'running'
      ? remainingSeconds(state.endsAt, now)
      : state.status === 'paused'
        ? state.left
        : state.status === 'done'
          ? 0
          : length;

  useEffect(() => {
    if (state.status === 'running' && left === 0 && !signalled.current) {
      signalled.current = true;
      setState({ status: 'done' });
      void signalTimerDone();
    }
  }, [state.status, left]);

  const start = (seconds: number) => {
    signalled.current = false;
    setState({ status: 'running', endsAt: Date.now() + seconds * 1000 });
  };
  const button = 'rounded-lg border px-4 py-2 font-semibold';

  return (
    <section aria-label="Stretch timer" className="flex flex-col items-center gap-3 rounded-lg border p-4">
      <h2 className="text-sm text-gray-400">Stretch timer</h2>
      <p role="timer" className="text-5xl tabular-nums">
        {formatDuration(left)}
      </p>
      {state.status === 'idle' && (
        <div className="flex gap-3">
          <button type="button" aria-label="15 seconds less" onClick={() => setLength(stepDuration(length, -1))} className={button}>
            −15 s
          </button>
          <button type="button" onClick={() => start(length)} className={`${button} bg-sky-600 text-white`}>
            Start
          </button>
          <button type="button" aria-label="15 seconds more" onClick={() => setLength(stepDuration(length, 1))} className={button}>
            +15 s
          </button>
        </div>
      )}
      {(state.status === 'running' || state.status === 'paused') && (
        <div className="flex gap-3">
          {state.status === 'running' ? (
            <button type="button" onClick={() => setState({ status: 'paused', left })} className={button}>
              Pause
            </button>
          ) : (
            <button type="button" onClick={() => start(state.left)} className={`${button} bg-sky-600 text-white`}>
              Resume
            </button>
          )}
          <button type="button" onClick={() => setState({ status: 'idle' })} className={button}>
            Reset
          </button>
        </div>
      )}
      {state.status === 'done' && (
        <div className="flex flex-col items-center gap-3">
          <p role="status">Done</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={async () => {
                await onLog(length);
                setState({ status: 'idle' });
              }}
              className={`${button} bg-sky-600 text-white`}
            >
              Log set ({formatDuration(length)})
            </button>
            <button type="button" onClick={() => setState({ status: 'idle' })} className={button}>
              Reset
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
