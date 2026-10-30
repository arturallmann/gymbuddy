'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import type { Phase } from '@/db/schema';
import {
  addWorkoutExercise,
  deleteWorkoutExercise,
  listWorkoutExercises,
  moveWorkoutExercise,
  type WorkoutExerciseItem,
} from '@/db/workouts';

// The workout exercises of one workout. `items` is undefined while they load.
export function useWorkoutExercises(workoutId: string) {
  const db = useDatabase();
  const [items, setItems] = useState<WorkoutExerciseItem[] | undefined>(undefined);

  const reload = useCallback(async () => {
    setItems(await listWorkoutExercises(db, workoutId));
  }, [db, workoutId]);

  useEffect(() => {
    let current = true;
    listWorkoutExercises(db, workoutId)
      .then((loaded) => current && setItems(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, workoutId]);

  const add = useCallback(
    async (exerciseId: string, phase: Phase = 'main') => {
      await addWorkoutExercise(db, workoutId, exerciseId, phase);
      await reload();
    },
    [db, workoutId, reload],
  );

  const move = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      await moveWorkoutExercise(db, id, direction);
      await reload();
    },
    [db, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteWorkoutExercise(db, id);
      await reload();
    },
    [db, reload],
  );

  return { items, add, move, remove };
}
