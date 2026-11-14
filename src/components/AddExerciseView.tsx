'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listMuscleGroups, searchExercises, type ExerciseListItem } from '@/db/exercises';
import type { MuscleGroup } from '@/db/schema';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { logExerciseHref, muscleGroupHref } from '@/lib/addExercise';
import ExerciseList from './ExerciseList';

// The "Add exercise" page (decision 031): a search field over all exercises, and otherwise the
// muscle groups, each opening its exercises. Tapping an exercise opens it to log a set; it joins
// the workout with that first set. The top bar links to saved supersets.
export default function AddExerciseView() {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const features = useFeatures();
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<MuscleGroup[] | undefined>(undefined);
  const [found, setFound] = useState<ExerciseListItem[] | undefined>(undefined);
  const searching = query.trim() !== '';

  useEffect(() => {
    listMuscleGroups(db)
      .then(setGroups)
      .catch((reason: unknown) => console.error(reason));
  }, [db]);

  useEffect(() => {
    if (!searching) return;
    let current = true;
    searchExercises(db, userId, query)
      .then((result) => current && setFound(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, query, searching]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-6">
      <header className="flex items-center gap-4">
        <Link href="/workout" className="shrink-0 text-link">
          ← Workout
        </Link>
        <h1 className="min-w-0 flex-1 text-xl font-bold">Add exercise</h1>
        {features.supersets && features.templates && (
          <Link href="/workout/add/superset" className="shrink-0 text-sm text-link">
            Saved supersets
          </Link>
        )}
      </header>
      <input
        type="search"
        aria-label="Search exercises"
        placeholder="Search exercises"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full min-w-0 rounded-lg border px-3 py-2"
      />
      {searching ? (
        found &&
        (found.length === 0 ? (
          <p className="text-muted">No exercise found.</p>
        ) : (
          <ExerciseList
            items={found}
            showImages={features.exerciseImages}
            href={(exercise) => logExerciseHref(exercise.id)}
          />
        ))
      ) : (
        <nav aria-label="Muscle groups">
          <ul className="flex flex-col">
            {groups?.map((group) => (
              <li key={group.id}>
                <Link
                  href={muscleGroupHref(group.id)}
                  className="flex items-center justify-between border-b border-line py-3 capitalize"
                >
                  {group.name}
                  <span aria-hidden className="text-muted">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </main>
  );
}
