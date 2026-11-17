'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import type { WorkoutSet } from '@/db/schema';
import { getTemplateTargets, type Targets } from '@/db/templateWorkouts';
import { addSet, deleteSet, getLastSets, listSets, updateSet } from '@/db/sets';
import type { SetValues } from '@/lib/sets';

// The sets of one workout exercise, the sets of this exercise in the last workout, and the
// template targets when it came from a template.
// Both are undefined while they load.
// `workoutExerciseId` is null for an exercise that is not in the workout yet: it has no sets,
// and `add` calls `onFirstSet`, which adds the exercise to the workout with that set.
export function useSets(
  workoutExerciseId: string | null,
  exerciseId: string,
  workoutId: string,
  onFirstSet?: (values: SetValues) => Promise<void>,
) {
  const db = useDatabase();
  const [sets, setSets] = useState<WorkoutSet[] | undefined>(undefined);
  const [lastSets, setLastSets] = useState<WorkoutSet[] | undefined>(undefined);
  const [targets, setTargets] = useState<Targets | null>(null);

  useEffect(() => {
    let current = true;
    Promise.all([
      workoutExerciseId ? listSets(db, workoutExerciseId) : [],
      getLastSets(db, exerciseId, workoutId),
      workoutExerciseId ? getTemplateTargets(db, workoutExerciseId) : null,
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
      if (!workoutExerciseId) {
        await onFirstSet?.(values);
        return;
      }
      await addSet(db, workoutExerciseId, values);
      setSets(await listSets(db, workoutExerciseId));
    },
    [db, workoutExerciseId, onFirstSet],
  );

  const update = useCallback(
    async (id: string, values: SetValues) => {
      await updateSet(db, id, values);
      if (workoutExerciseId) setSets(await listSets(db, workoutExerciseId));
    },
    [db, workoutExerciseId],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteSet(db, id);
      if (workoutExerciseId) setSets(await listSets(db, workoutExerciseId));
    },
    [db, workoutExerciseId],
  );

  return { sets, lastSets, targets, add, update, remove };
}
