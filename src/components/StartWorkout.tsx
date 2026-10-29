'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import ElapsedTime from './ElapsedTime';

// "Start workout", or "Continue workout" while a workout is active.
export default function StartWorkout() {
  const { workout, start } = useActiveWorkout();
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  if (workout === undefined) {
    return null;
  }
  if (workout) {
    return (
      <Link href="/workout" className="flex flex-col items-center rounded-lg bg-sky-600 px-6 py-3 text-white">
        <span className="font-semibold">Continue workout</span>
        <ElapsedTime since={workout.startedAt} />
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={starting}
      onClick={async () => {
        setStarting(true);
        await start();
        router.push('/workout');
      }}
      className="rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
    >
      Start workout
    </button>
  );
}
