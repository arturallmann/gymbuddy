'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { getWorkoutExercise, type WorkoutExerciseItem } from '@/db/workouts';
import SetLog from './SetLog';

type Loaded = (WorkoutExerciseItem & { workoutId: string }) | null;

// One workout exercise on its own page: last time, its sets and the set form.
// The workout exercise id comes from the address: /workout/exercise?id=…
export default function WorkoutExerciseView() {
  const db = useDatabase();
  const id = useSearchParams().get('id');
  const [item, setItem] = useState<Loaded | undefined>(undefined);

  useEffect(() => {
    let current = true;
    (id ? getWorkoutExercise(db, id) : Promise.resolve(null))
      .then((loaded) => current && setItem(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, id]);

  if (item === undefined) {
    return null;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <Link href="/workout" className="shrink-0 text-sky-600">
          ← Workout
        </Link>
        <h1 className="min-w-0 break-words text-2xl font-bold">{item?.name ?? 'Exercise'}</h1>
      </header>
      {item ? (
        <SetLog item={item} workoutId={item.workoutId} />
      ) : (
        <p className="text-gray-500">This exercise is not in the workout.</p>
      )}
    </main>
  );
}
