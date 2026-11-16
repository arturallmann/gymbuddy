'use client';

import { useCallback, useEffect, useState } from 'react';
import { addBodyweight, deleteBodyweight, listBodyweights } from '@/db/bodyweights';
import { useDatabase } from '@/db/DatabaseContext';
import type { Bodyweight } from '@/db/schema';
import { useSettings } from './useSettings';

// The user's bodyweights, oldest first, with add and delete (decision 043).
// `bodyweights` is undefined until they load.
export function useBodyweights() {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const [bodyweights, setBodyweights] = useState<Bodyweight[] | undefined>(undefined);

  const reload = useCallback(() => listBodyweights(db, userId).then(setBodyweights), [db, userId]);

  useEffect(() => {
    let current = true;
    listBodyweights(db, userId)
      .then((loaded) => current && setBodyweights(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId]);

  const add = async (weightGrams: number) => {
    await addBodyweight(db, userId, weightGrams);
    await reload();
  };
  const remove = async (id: string) => {
    await deleteBodyweight(db, id);
    await reload();
  };
  return { bodyweights, add, remove };
}
