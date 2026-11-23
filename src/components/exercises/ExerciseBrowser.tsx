'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listMuscleGroups, searchExercises, type ExerciseListItem } from '@/db/exercises';
import type { Category, MuscleGroup } from '@/db/schema';
import { useExerciseUse } from '@/hooks/useExerciseUse';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { exerciseBrowserHref, exerciseDetailHref, parseBrowserFilter } from '@/lib/exerciseBrowser';
import CategoryFilter from './CategoryFilter';
import ExerciseResults from './ExerciseResults';

// Room for the whole library, so a muscle group filter shows every match.
const BROWSE_LIMIT = 2000;

// Search the exercise library by name, category, muscle group and custom exercises only (decision 035).
// The search and filters live in the address (/exercises?q=…&muscle=…&category=…&custom=1), and each
// exercise page gets that address as `back`, so its back arrow and Android Back return to the same list.
export default function ExerciseBrowser() {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const features = useFeatures();
  const params = useSearchParams();
  const [initial] = useState(() => parseBrowserFilter(params));
  const [query, setQuery] = useState(initial.query);
  const [muscleGroupId, setMuscleGroupId] = useState(initial.muscleGroupId);
  const [category, setCategory] = useState<Category | null>(initial.category);
  const [customOnly, setCustomOnly] = useState(initial.customOnly);
  const href = exerciseBrowserHref({ query, muscleGroupId, category, customOnly });
  const use = useExerciseUse();
  const [groups, setGroups] = useState<MuscleGroup[]>([]);
  const [found, setFound] = useState<ExerciseListItem[] | undefined>(undefined);

  useEffect(() => {
    listMuscleGroups(db)
      .then(setGroups)
      .catch((reason: unknown) => console.error(reason));
  }, [db]);

  useEffect(() => {
    let current = true;
    searchExercises(db, userId, query, { muscleGroupId: muscleGroupId || null, category, customOnly, limit: BROWSE_LIMIT })
      .then((result) => current && setFound(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, query, muscleGroupId, category, customOnly]);

  // Without a navigation, so typing in the search field does not load the page again.
  useEffect(() => {
    if (`${window.location.pathname}${window.location.search}` !== href) window.history.replaceState(null, '', href);
  }, [href]);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/exercises/edit" className="rounded-lg border bg-surface px-4 py-2 text-center font-medium">
        New custom exercise
      </Link>
      <input
        type="search"
        aria-label="Search exercises"
        placeholder="Search exercises"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full min-w-0 rounded-lg border px-3 py-2"
      />
      <CategoryFilter value={category} onChange={setCategory} />
      <div className="flex gap-2">
        <select
          aria-label="Muscle group"
          value={muscleGroupId}
          onChange={(event) => setMuscleGroupId(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border px-3 py-2"
        >
          <option value="">All muscle groups</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={customOnly}
          onClick={() => setCustomOnly(!customOnly)}
          className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${customOnly ? 'border-primary bg-primary text-on-primary' : 'bg-surface'}`}
        >
          Custom only
        </button>
      </div>
      {found && use && (
        <>
          <p className="text-sm text-muted">{found.length === 1 ? '1 exercise' : `${found.length} exercises`}</p>
          {found.length === 0 ? (
            <p className="text-muted">No exercise found.</p>
          ) : (
            <ExerciseResults
              items={found}
              use={use}
              showImages={features.exerciseImages}
              href={(exercise) => exerciseDetailHref(exercise.id, href)}
            />
          )}
        </>
      )}
    </div>
  );
}
