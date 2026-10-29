'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ConfirmAction from '@/components/ConfirmAction';
import ElapsedTime from '@/components/ElapsedTime';
import WorkoutExercises from '@/components/WorkoutExercises';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';

export default function WorkoutPage() {
  const { workout, end, discard } = useActiveWorkout();
  const router = useRouter();
  const [ending, setEnding] = useState(false);

  if (workout === undefined) {
    return null;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-8 p-6">
      <header className="flex items-center gap-4">
        <Link href="/" className="text-sky-600">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Workout</h1>
      </header>
      {workout ? (
        <>
          <p className="text-4xl">
            <ElapsedTime since={workout.startedAt} />
          </p>
          <WorkoutExercises workoutId={workout.id} />
          <button
            type="button"
            disabled={ending}
            onClick={async () => {
              setEnding(true);
              await end();
              router.push('/');
            }}
            className="rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            End workout
          </button>
          <ConfirmAction
            label="Discard workout"
            question="Discard this workout? Its exercises and sets are deleted."
            confirmLabel="Discard"
            keepLabel="Keep workout"
            onConfirm={async () => {
              await discard();
              router.push('/');
            }}
          />
        </>
      ) : (
        <p className="text-gray-500">No active workout.</p>
      )}
    </main>
  );
}
