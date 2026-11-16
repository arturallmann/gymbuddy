'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listMuscleGroups, searchExercises, type ExerciseListItem } from '@/db/exercises';
import type { MuscleGroup } from '@/db/schema';
import { useExerciseUse } from '@/hooks/useExerciseUse';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { addExerciseHref, logExerciseHref, muscleGroupHref, parseCategory } from '@/lib/addExercise';
import { CATEGORY_LABELS } from '@/lib/exercises';
import ExerciseResults from './ExerciseResults';
import BackLink from './BackLink';

// Room for every exercise of one muscle group.
const LIMIT = 2000;

type Loaded = { group: MuscleGroup; items: ExerciseListItem[] } | null;

// The exercises whose primary muscle group is this one, from the "Add exercise" page
// (decisions 031 and 032), of the chosen category when there is one.
// The address holds the muscle group id and the category: /workout/add/muscle?id=…&category=…
export default function MuscleGroupExercises() {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const features = useFeatures();
  const params = useSearchParams();
  const id = params.get('id');
  const category = parseCategory(params.get('category'));
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);
  const use = useExerciseUse();

  useEffect(() => {
    let current = true;
    const load = async (): Promise<Loaded> => {
      const group = (await listMuscleGroups(db)).find((candidate) => candidate.id === id);
      if (!group) return null;
      return { group, items: await searchExercises(db, userId, '', { muscleGroupId: group.id, role: 'primary', category, limit: LIMIT }) };
    };
    load()
      .then((result) => current && setLoaded(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, id, category]);

  if (loaded === undefined || use === undefined) {
    return null;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-6">
      <header className="flex items-center gap-4">
        <BackLink href={addExerciseHref(category)} label="Back to add exercise" />
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold capitalize">{loaded?.group.name ?? 'Muscle group'}</h1>
          {category && <p className="text-sm text-muted">{CATEGORY_LABELS[category]}</p>}
        </div>
      </header>
      {!loaded ? (
        <p className="text-muted">This muscle group does not exist.</p>
      ) : loaded.items.length === 0 ? (
        <p className="text-muted">No exercise found.</p>
      ) : (
        <ExerciseResults
          items={loaded.items}
          use={use}
          showImages={features.exerciseImages}
          href={(exercise) => logExerciseHref(exercise.id, muscleGroupHref(loaded.group.id, category))}
        />
      )}
    </main>
  );
}
