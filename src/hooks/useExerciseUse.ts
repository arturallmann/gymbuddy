'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listExerciseUse, type ExerciseUse } from '@/db/progress';
import { useSettings } from './useSettings';

// How often the user did each exercise (decision 037). Undefined while it loads.
export function useExerciseUse(): Map<string, ExerciseUse> | undefined {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const [use, setUse] = useState<Map<string, ExerciseUse> | undefined>(undefined);

  useEffect(() => {
    let current = true;
    listExerciseUse(db, userId)
      .then((loaded) => current && setUse(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId]);

  return use;
}
