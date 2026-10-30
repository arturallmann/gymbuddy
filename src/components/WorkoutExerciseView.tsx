'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { getExerciseDetail, type ExerciseDetail } from '@/db/exercises';
import { getWorkoutExercise, type WorkoutExerciseItem } from '@/db/workouts';
import { useExercisePreferences } from '@/hooks/useExercisePreferences';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { exerciseImageUrl, shortDescription } from '@/lib/exercises';
import { getUnits } from '@/lib/units';
import ExercisePreferencesForm from './ExercisePreferencesForm';
import SetLog from './SetLog';

type Loaded = {
  item: WorkoutExerciseItem & { workoutId: string };
  // Null when the exercise is no longer in the browser, such as a deleted custom exercise.
  detail: ExerciseDetail | null;
} | null;

// One workout exercise on its own page: what the exercise is, the user's notes and
// units for it, last time, the set form and the logged sets.
// The workout exercise id comes from the address: /workout/exercise?id=…
export default function WorkoutExerciseView() {
  const db = useDatabase();
  const { settings } = useSettings();
  const features = useFeatures();
  const id = useSearchParams().get('id');
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);
  const { preferences, units, save } = useExercisePreferences(loaded?.item.exerciseId ?? null);

  useEffect(() => {
    let current = true;
    const load = async (): Promise<Loaded> => {
      const item = id ? await getWorkoutExercise(db, id) : null;
      return item ? { item, detail: await getExerciseDetail(db, settings.userId, item.exerciseId) } : null;
    };
    load()
      .then((result) => current && setLoaded(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, settings.userId, id]);

  if (loaded === undefined) {
    return null;
  }
  const item = loaded?.item;
  const detail = loaded?.detail ?? null;
  const image = detail?.images[0];
  const primary = detail?.muscleGroups.filter((group) => group.role === 'primary').map((group) => group.name) ?? [];
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <Link href="/workout" className="shrink-0 text-sky-600">
          ← Workout
        </Link>
        <h1 className="min-w-0 break-words text-2xl font-bold">{item?.name ?? 'Exercise'}</h1>
      </header>
      {!item ? (
        <p className="text-gray-500">This exercise is not in the workout.</p>
      ) : (
        <>
          {detail && (
            <section aria-label="About the exercise" className="flex items-start gap-3">
              {features.exerciseImages && image && (
                <Image
                  src={exerciseImageUrl(image)}
                  alt={`${item.name}, image 1`}
                  width={96}
                  height={72}
                  className="h-[72px] w-24 shrink-0 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm text-gray-400">{shortDescription(detail.exercise, primary)}</p>
                <Link href={`/exercises/detail?id=${detail.exercise.id}`} className="text-sm text-sky-600">
                  Exercise details
                </Link>
              </div>
            </section>
          )}
          {preferences?.notes && <p className="break-words rounded-lg border px-3 py-2">{preferences.notes}</p>}
          {preferences !== undefined && (
            <details className="rounded-lg border px-3 py-2">
              <summary className="cursor-pointer text-sm text-gray-400">
                Notes and units ({units.weightUnit})
              </summary>
              <div className="mt-3">
                <ExercisePreferencesForm preferences={preferences} settingsUnits={getUnits(settings)} onSave={save} />
              </div>
            </details>
          )}
          {preferences !== undefined && <SetLog item={item} workoutId={item.workoutId} units={units} />}
        </>
      )}
    </main>
  );
}
