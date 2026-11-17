'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import BackLink from '@/components/ui/BackLink';
import ElapsedTime from '@/components/workout/ElapsedTime';
import SaveRoutine from '@/components/templates/SaveRoutine';
import WorkoutExercises from '@/components/workout/WorkoutExercises';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { useFeatures } from '@/hooks/useSettings';

// The active workout. "Save as routine" sits in the top bar; "End workout" and the + button,
// which opens the "Add exercise" page, sit in a bar at the bottom (decision 032). There is no
// discard: an ended workout can be deleted from its workout history page (decision 031).
export default function WorkoutPage() {
  const { workout, end } = useActiveWorkout();
  const features = useFeatures();
  const router = useRouter();
  const [ending, setEnding] = useState(false);

  if (workout === undefined) {
    return null;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6 pb-32">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <BackLink href="/" label="Back" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">Workout</h1>
          {workout && (
            <p className="text-sm text-muted">
              <ElapsedTime since={workout.startedAt} />
            </p>
          )}
        </div>
        {workout && <SaveRoutine workoutId={workout.id} startedAt={workout.startedAt} compact />}
      </header>
      {workout ? (
        <>
          <WorkoutExercises workoutId={workout.id} />
          <div className="fixed inset-x-0 bottom-0 border-t border-line bg-page pb-[env(safe-area-inset-bottom,0px)]">
            <div className="mx-auto flex max-w-xl items-center gap-4 px-6 py-3">
              <button
                type="button"
                disabled={ending}
                onClick={async () => {
                  setEnding(true);
                  await end();
                  // With the statistics feature toggle the "Workout ended" page shows what it did (decision 046).
                  router.push(features.statistics ? `/workout/ended?id=${workout.id}` : '/');
                }}
                className="flex-1 rounded-lg border bg-surface px-6 py-3 font-semibold disabled:opacity-50"
              >
                End workout
              </button>
              <Link
                href="/workout/add"
                aria-label="Add exercise"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-3xl leading-none text-on-primary shadow-lg"
              >
                <span aria-hidden>+</span>
              </Link>
            </div>
          </div>
        </>
      ) : (
        <p className="text-muted">No active workout.</p>
      )}
    </main>
  );
}
