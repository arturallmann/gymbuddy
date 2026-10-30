'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import type { Workout } from '@/db/schema';
import { deleteWorkout, getWorkout, listWorkoutExercises, type WorkoutExerciseItem } from '@/db/workouts';
import { formatWorkoutDate } from '@/lib/dates';
import { formatWorkoutDuration } from '@/lib/units';
import ConfirmAction from './ConfirmAction';
import SaveRoutine from './SaveRoutine';
import WorkoutExerciseSets from './WorkoutExerciseSets';

type Loaded = { workout: Workout; items: WorkoutExerciseItem[] } | null;

// One past workout with all its workout exercises and sets.
// The workout id comes from the address: /history/workout?id=…
export default function WorkoutDetail() {
  const db = useDatabase();
  const router = useRouter();
  const id = useSearchParams().get('id');
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);

  useEffect(() => {
    let current = true;
    const load = async (): Promise<Loaded> => {
      const workout = id ? await getWorkout(db, id) : null;
      return workout ? { workout, items: await listWorkoutExercises(db, workout.id) } : null;
    };
    load()
      .then((result) => current && setLoaded(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, id]);

  if (loaded === undefined) {
    return null;
  }
  const workout = loaded?.workout;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <Link href="/history" className="shrink-0 text-sky-600">
          ← Workout history
        </Link>
      </header>
      {!loaded || !workout ? (
        <p className="text-gray-500">This workout does not exist.</p>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold">{formatWorkoutDate(workout.startedAt)}</h1>
            <p className="text-gray-500">
              {workout.endedAt
                ? formatWorkoutDuration((workout.endedAt.getTime() - workout.startedAt.getTime()) / 1000)
                : 'Active workout'}
            </p>
            {workout.notes && <p className="mt-2 break-words">{workout.notes}</p>}
          </div>
          {loaded.items.length === 0 ? (
            <p className="text-gray-500">No exercises.</p>
          ) : (
            loaded.items.map((item) => <WorkoutExerciseSets key={item.id} item={item} />)
          )}
          <SaveRoutine workoutId={workout.id} startedAt={workout.startedAt} />
          <ConfirmAction
            label="Delete workout"
            question="Delete this workout? Its exercises and sets are deleted."
            confirmLabel="Delete"
            keepLabel="Keep workout"
            onConfirm={async () => {
              await deleteWorkout(db, workout.id);
              router.push('/history');
            }}
          />
        </>
      )}
    </main>
  );
}
