'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { getExercisePreferences, saveExercisePreferences, type ExercisePreferencesChange } from '@/db/preferences';
import type { ExercisePreferences } from '@/db/schema';
import { getUnits, type Units } from '@/lib/units';
import { useSettings } from './useSettings';

// The user's preferences for one exercise and the units that follow from them.
// `preferences` is undefined while it loads and null when nothing is saved yet.
export function useExercisePreferences(exerciseId: string | null) {
  const db = useDatabase();
  const { settings } = useSettings();
  const [preferences, setPreferences] = useState<ExercisePreferences | null | undefined>(undefined);

  useEffect(() => {
    let current = true;
    (exerciseId ? getExercisePreferences(db, settings.userId, exerciseId) : Promise.resolve(null))
      .then((loaded) => current && setPreferences(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, settings.userId, exerciseId]);

  const save = useCallback(
    async (change: ExercisePreferencesChange) => {
      if (!exerciseId) return;
      setPreferences(await saveExercisePreferences(db, settings.userId, exerciseId, change));
    },
    [db, settings.userId, exerciseId],
  );

  const units: Units = getUnits(settings, preferences);
  return { preferences, units, save };
}
