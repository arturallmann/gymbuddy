'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listExercisePreferences } from '@/db/preferences';
import type { WorkoutSet } from '@/db/schema';
import { addSet, deleteSet, getLastSets, listSets, updateSet, type WorkoutExerciseItem } from '@/db/workouts';
import type { SetValues } from '@/lib/sets';
import { getUnits, type Units } from '@/lib/units';
import { useSettings } from './useSettings';

type GroupSets = {
  // Per member, in member order.
  sets: WorkoutSet[][];
  lastSets: WorkoutSet[][];
  units: Units[];
};

// The sets of every member of an exercise group, with each member's units (its unit override,
// otherwise the settings) and last time's sets. Undefined while it loads.
export function useGroupSets(members: WorkoutExerciseItem[], workoutId: string) {
  const db = useDatabase();
  const { settings } = useSettings();
  const [data, setData] = useState<GroupSets | undefined>(undefined);
  const key = members.map((member) => member.id).join(',');

  const load = useCallback(async (): Promise<GroupSets> => {
    const preferences = await listExercisePreferences(
      db,
      settings.userId,
      members.map((member) => member.exerciseId),
    );
    const [sets, lastSets] = await Promise.all([
      Promise.all(members.map((member) => listSets(db, member.id))),
      Promise.all(members.map((member) => getLastSets(db, member.exerciseId, workoutId))),
    ]);
    return { sets, lastSets, units: members.map((member) => getUnits(settings, preferences.get(member.exerciseId))) };
    // `key` stands for the members; the array itself changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, settings, workoutId, key]);

  useEffect(() => {
    let current = true;
    load()
      .then((loaded) => current && setData(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [load]);

  const reload = useCallback(async () => setData(await load()), [load]);

  const add = useCallback(
    async (memberIndex: number, values: SetValues) => {
      await addSet(db, members[memberIndex].id, values);
      await reload();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, key, reload],
  );

  const update = useCallback(
    async (setId: string, values: SetValues) => {
      await updateSet(db, setId, values);
      await reload();
    },
    [db, reload],
  );

  const remove = useCallback(
    async (setId: string) => {
      await deleteSet(db, setId);
      await reload();
    },
    [db, reload],
  );

  return { data, add, update, remove };
}
