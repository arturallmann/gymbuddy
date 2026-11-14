'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listMuscleGroups, searchExercises, type ExerciseListItem } from '@/db/exercises';
import type { MuscleGroup } from '@/db/schema';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { logExerciseHref } from '@/lib/addExercise';
import ExerciseList from './ExerciseList';

// Room for every exercise of one muscle group.
const LIMIT = 2000;

type Loaded = { group: MuscleGroup; items: ExerciseListItem[] } | null;

// The exercises that work one muscle group, from the "Add exercise" page (decision 031).
// The muscle group id comes from the address: /workout/add/muscle?id=…
export default function MuscleGroupExercises() {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const features = useFeatures();
  const id = useSearchParams().get('id');
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);

  useEffect(() => {
    let current = true;
    const load = async (): Promise<Loaded> => {
      const group = (await listMuscleGroups(db)).find((candidate) => candidate.id === id);
      if (!group) return null;
      return { group, items: await searchExercises(db, userId, '', { muscleGroupId: group.id, limit: LIMIT }) };
    };
    load()
      .then((result) => current && setLoaded(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, id]);

  if (loaded === undefined) {
    return null;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-6">
      <header className="flex items-center gap-4">
        <Link href="/workout/add" className="shrink-0 text-link">
          ← Add exercise
        </Link>
        <h1 className="min-w-0 break-words text-2xl font-bold capitalize">{loaded?.group.name ?? 'Muscle group'}</h1>
      </header>
      {!loaded ? (
        <p className="text-muted">This muscle group does not exist.</p>
      ) : loaded.items.length === 0 ? (
        <p className="text-muted">No exercise found.</p>
      ) : (
        <ExerciseList
          items={loaded.items}
          showImages={features.exerciseImages}
          href={(exercise) => logExerciseHref(exercise.id)}
        />
      )}
    </main>
  );
}
