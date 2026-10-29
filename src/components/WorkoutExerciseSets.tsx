'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import type { WorkoutSet } from '@/db/schema';
import { listSets, type WorkoutExerciseItem } from '@/db/workouts';
import { useExercisePreferences } from '@/hooks/useExercisePreferences';
import SetList from './SetList';

// One workout exercise of a past workout: its name and its sets, read-only.
export default function WorkoutExerciseSets({ item }: { item: WorkoutExerciseItem }) {
  const db = useDatabase();
  const { units } = useExercisePreferences(item.exerciseId);
  const [sets, setSets] = useState<WorkoutSet[] | undefined>(undefined);

  useEffect(() => {
    let current = true;
    listSets(db, item.id)
      .then((loaded) => current && setSets(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, item.id]);

  return (
    <section aria-label={item.name} className="flex flex-col gap-2 rounded-lg border p-3">
      <h2 className="break-words font-semibold">{item.name}</h2>
      {sets && sets.length === 0 && <p className="text-sm text-gray-500">No sets</p>}
      {sets && <SetList sets={sets} loadType={item.loadType} units={units} />}
    </section>
  );
}
