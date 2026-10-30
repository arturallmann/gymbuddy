'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import type { Workout } from '@/db/schema';
import { deleteWorkout, endWorkout, getActiveWorkout, startWorkout } from '@/db/workouts';
import { useSettings } from './useSettings';

// The active workout of the local user. `workout` is undefined while it loads
// and null when there is no active workout.
export function useActiveWorkout() {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const [workout, setWorkout] = useState<Workout | null | undefined>(undefined);

  useEffect(() => {
    let current = true;
    getActiveWorkout(db, userId)
      .then((loaded) => current && setWorkout(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId]);

  const start = useCallback(async () => {
    const started = await startWorkout(db, userId);
    setWorkout(started);
    return started;
  }, [db, userId]);

  const end = useCallback(async () => {
    if (!workout) return;
    await endWorkout(db, workout.id);
    setWorkout(null);
  }, [db, workout]);

  const discard = useCallback(async () => {
    if (!workout) return;
    await deleteWorkout(db, workout.id);
    setWorkout(null);
  }, [db, workout]);

  return { workout, start, end, discard };
}
