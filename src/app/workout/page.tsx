'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ElapsedTime from '@/components/ElapsedTime';
import SaveRoutine from '@/components/SaveRoutine';
import WorkoutExercises from '@/components/WorkoutExercises';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';

// The active workout. "End workout" sits in the top bar; the + button opens the "Add exercise"
// page. There is no discard: an ended workout can be deleted from its workout history page
// (decision 031).
export default function WorkoutPage() {
  const { workout, end } = useActiveWorkout();
  const router = useRouter();
  const [ending, setEnding] = useState(false);

  if (workout === undefined) {
    return null;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6 pb-28">
      <header className="flex items-center gap-4">
        <Link href="/" className="shrink-0 text-link">
          ← Back
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">Workout</h1>
          {workout && (
            <p className="text-sm text-muted">
              <ElapsedTime since={workout.startedAt} />
            </p>
          )}
        </div>
        {workout && (
          <button
            type="button"
            disabled={ending}
            onClick={async () => {
              setEnding(true);
              await end();
              router.push('/');
            }}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
          >
            End workout
          </button>
        )}
      </header>
      {workout ? (
        <>
          <WorkoutExercises workoutId={workout.id} />
          <SaveRoutine workoutId={workout.id} startedAt={workout.startedAt} />
          <Link
            href="/workout/add"
            aria-label="Add exercise"
            className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-3xl leading-none text-on-primary shadow-lg"
          >
            <span aria-hidden>+</span>
          </Link>
        </>
      ) : (
        <p className="text-muted">No active workout.</p>
      )}
    </main>
  );
}
