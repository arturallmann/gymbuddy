'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import type { WorkoutSet } from '@/db/schema';
import { getTemplateTargets, type Targets } from '@/db/templates';
import { addSet, deleteSet, getLastSets, listSets, updateSet } from '@/db/workouts';
import type { SetValues } from '@/lib/sets';

// The sets of one workout exercise, the sets of this exercise in the last workout, and the
// template targets when it came from a template.
// Both are undefined while they load.
export function useSets(workoutExerciseId: string, exerciseId: string, workoutId: string) {
  const db = useDatabase();
  const [sets, setSets] = useState<WorkoutSet[] | undefined>(undefined);
  const [lastSets, setLastSets] = useState<WorkoutSet[] | undefined>(undefined);
  const [targets, setTargets] = useState<Targets | null>(null);

  useEffect(() => {
    let current = true;
    Promise.all([
      listSets(db, workoutExerciseId),
      getLastSets(db, exerciseId, workoutId),
      getTemplateTargets(db, workoutExerciseId),
    ])
      .then(([loaded, last, fromTemplate]) => {
        if (!current) return;
        setSets(loaded);
        setLastSets(last);
        setTargets(fromTemplate);
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

  return { sets, lastSets, targets, add, update, remove };
}
