'use client';

import { useEffect, useRef, useState } from 'react';
import { useNow } from '@/hooks/useNow';
import { remainingSeconds } from '@/lib/timer';
import { formatDuration } from '@/lib/units';
import { signalTimerDone } from '@/native/alert';

type Props = {
  seconds: number;
  // Closes the timer: after "Skip rest" or once the user has seen that the rest is over.
  onClose: () => void;
};

// Counts the rest down from the moment it appears. At zero the phone vibrates and plays a tone.
export default function RestTimer({ seconds, onClose }: Props) {
  const [endsAt] = useState(() => Date.now() + seconds * 1000);
  const left = remainingSeconds(endsAt, useNow(250).getTime());
  const signalled = useRef(false);

  useEffect(() => {
    if (left === 0 && !signalled.current) {
      signalled.current = true;
      void signalTimerDone();
    }
  }, [left]);

  return (
    <section aria-label="Rest timer" className="flex flex-col items-center gap-3 rounded-lg border border-sky-700 p-4">
      <h2 className="text-sm text-gray-400">Rest</h2>
      <p role="timer" className="text-5xl tabular-nums">
        {formatDuration(left)}
      </p>
      {left === 0 && <p role="status">Rest is over</p>}
      <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 font-semibold">
        {left === 0 ? 'Next round' : 'Skip rest'}
      </button>
    </section>
  );
}
