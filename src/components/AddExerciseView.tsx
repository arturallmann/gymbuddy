'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listPrimaryMuscleGroups, searchExercises, type ExerciseListItem } from '@/db/exercises';
import type { Category, MuscleGroup } from '@/db/schema';
import { useExerciseUse } from '@/hooks/useExerciseUse';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { addExerciseHref, logExerciseHref, muscleGroupHref, parseCategory } from '@/lib/addExercise';
import CategoryFilter from './CategoryFilter';
import ExerciseResults from './ExerciseResults';
import BackLink from './BackLink';

// Room for every match, so an exercise the user did is never cut off before "Done before".
const SEARCH_LIMIT = 2000;

// The "Add exercise" page (decisions 031 and 032): a search field over all exercises, and otherwise
// the muscle groups, each opening the exercises where it is the primary muscle group. A category
// filter narrows both; it lives in the address, so it stays when the user comes back.
// Tapping an exercise opens it to log a set; it joins the workout with that first set.
// The top bar links to saved supersets.
export default function AddExerciseView() {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const features = useFeatures();
  const router = useRouter();
  const params = useSearchParams();
  const [category, setCategory] = useState<Category | null>(() => parseCategory(params.get('category')));
  const [query, setQuery] = useState('');
  const use = useExerciseUse();
  const [groups, setGroups] = useState<MuscleGroup[] | undefined>(undefined);
  const [found, setFound] = useState<ExerciseListItem[] | undefined>(undefined);
  const searching = query.trim() !== '';

  useEffect(() => {
    let current = true;
    listPrimaryMuscleGroups(db, userId, category)
      .then((result) => current && setGroups(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, category]);

  useEffect(() => {
    if (!searching) return;
    let current = true;
    searchExercises(db, userId, query, { category, limit: SEARCH_LIMIT })
      .then((result) => current && setFound(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, query, searching, category]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-6">
      <header className="flex items-center gap-4">
        <BackLink href="/workout" label="Back to workout" />
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
      <CategoryFilter
        value={category}
        onChange={(chosen) => {
          setCategory(chosen);
          router.replace(addExerciseHref(chosen));
        }}
      />
      {searching ? (
        found &&
        use &&
        (found.length === 0 ? (
          <p className="text-muted">No exercise found.</p>
        ) : (
          <ExerciseResults
            items={found}
            use={use}
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
                  href={muscleGroupHref(group.id, category)}
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
          {groups?.length === 0 && <p className="text-muted">No exercise found.</p>}
        </nav>
      )}
    </main>
  );
}
