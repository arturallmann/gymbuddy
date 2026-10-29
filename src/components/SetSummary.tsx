'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import type { LoadType, WorkoutSet } from '@/db/schema';
import { listSets } from '@/db/workouts';
import { useExercisePreferences } from '@/hooks/useExercisePreferences';
import { formatSet } from '@/lib/sets';

type Props = { workoutExerciseId: string; exerciseId: string; loadType: LoadType };

// One line about the sets of a workout exercise, such as "60 kg × 8, 60 kg × 6".
export default function SetSummary({ workoutExerciseId, exerciseId, loadType }: Props) {
  const db = useDatabase();
  const { units } = useExercisePreferences(exerciseId);
  const [sets, setSets] = useState<WorkoutSet[] | undefined>(undefined);

  useEffect(() => {
    let current = true;
    listSets(db, workoutExerciseId)
      .then((loaded) => current && setSets(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, workoutExerciseId]);

  if (sets === undefined) {
    return null;
  }
  return (
    <span className="block text-sm text-gray-500">
      {sets.length === 0 ? 'No sets yet' : sets.map((set) => formatSet(set, loadType, units)).join(', ')}
    </span>
  );
}
