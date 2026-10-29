'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import type { WorkoutSet } from '@/db/schema';
import { addSet, deleteSet, getLastSets, listSets, updateSet } from '@/db/workouts';
import type { SetValues } from '@/lib/sets';

// The sets of one workout exercise, and the sets of this exercise in the last workout.
// Both are undefined while they load.
export function useSets(workoutExerciseId: string, exerciseId: string, workoutId: string) {
  const db = useDatabase();
  const [sets, setSets] = useState<WorkoutSet[] | undefined>(undefined);
  const [lastSets, setLastSets] = useState<WorkoutSet[] | undefined>(undefined);

  useEffect(() => {
    let current = true;
    Promise.all([listSets(db, workoutExerciseId), getLastSets(db, exerciseId, workoutId)])
      .then(([loaded, last]) => {
        if (!current) return;
        setSets(loaded);
        setLastSets(last);
      })
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, workoutExerciseId, exerciseId, workoutId]);

  const add = useCallback(
    async (values: SetValues) => {
      await addSet(db, workoutExerciseId, values);
      setSets(await listSets(db, workoutExerciseId));
    },
    [db, workoutExerciseId],
  );

  const update = useCallback(
    async (id: string, values: SetValues) => {
      await updateSet(db, id, values);
      setSets(await listSets(db, workoutExerciseId));
    },
    [db, workoutExerciseId],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteSet(db, id);
      setSets(await listSets(db, workoutExerciseId));
    },
    [db, workoutExerciseId],
  );

  return { sets, lastSets, add, update, remove };
}
