'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listMuscleGroups, searchExercises, type ExerciseListItem } from '@/db/exercises';
import type { Category, MuscleGroup } from '@/db/schema';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import CategoryFilter from './CategoryFilter';
import ExerciseList from './ExerciseList';

// Room for the whole library, so a muscle group filter shows every match.
const BROWSE_LIMIT = 2000;

// Search the exercise library by name, category, muscle group and custom exercises only (decision 035).
export default function ExerciseBrowser() {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const features = useFeatures();
  const [query, setQuery] = useState('');
  const [muscleGroupId, setMuscleGroupId] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [customOnly, setCustomOnly] = useState(false);
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

  return (
    <div className="flex flex-col gap-4">
      <Link href="/exercises/edit" className="rounded-lg border bg-surface px-4 py-2 text-center font-semibold">
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
      {found && (
        <>
          <p className="text-sm text-muted">{found.length === 1 ? '1 exercise' : `${found.length} exercises`}</p>
          {found.length === 0 ? (
            <p className="text-muted">No exercise found.</p>
          ) : (
            <ExerciseList items={found} showImages={features.exerciseImages} />
          )}
        </>
      )}
    </div>
  );
}
