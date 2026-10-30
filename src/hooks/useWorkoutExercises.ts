'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listGroupRests, makeSuperset, ungroupWorkoutExercises } from '@/db/groups';
import type { Phase } from '@/db/schema';
import { addTemplateToWorkout } from '@/db/templates';
import {
  addWorkoutExercise,
  deleteWorkoutExercise,
  listWorkoutExercises,
  moveWorkoutExercise,
  type WorkoutExerciseItem,
} from '@/db/workouts';

async function loadAll(db: ReturnType<typeof useDatabase>, workoutId: string) {
  const items = await listWorkoutExercises(db, workoutId);
  const groupIds = [...new Set(items.flatMap((item) => (item.groupId ? [item.groupId] : [])))];
  return { items, rests: await listGroupRests(db, groupIds) };
}

// The workout exercises of one workout, and the rest of each exercise group.
// `items` is undefined while they load.
export function useWorkoutExercises(workoutId: string) {
  const db = useDatabase();
  const [items, setItems] = useState<WorkoutExerciseItem[] | undefined>(undefined);
  const [rests, setRests] = useState<Map<string, number | null>>(new Map());

  const reload = useCallback(async () => {
    const loaded = await loadAll(db, workoutId);
    setItems(loaded.items);
    setRests(loaded.rests);
  }, [db, workoutId]);

  useEffect(() => {
    let current = true;
    loadAll(db, workoutId)
      .then((loaded) => {
        if (!current) return;
        setItems(loaded.items);
        setRests(loaded.rests);
      })
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

  const group = useCallback(
    async (ids: string[]) => {
      await makeSuperset(db, workoutId, ids);
      await reload();
    },
    [db, workoutId, reload],
  );

  const ungroup = useCallback(
    async (groupId: string) => {
      await ungroupWorkoutExercises(db, groupId);
      await reload();
    },
    [db, reload],
  );

  const addTemplate = useCallback(
    async (templateId: string) => {
      await addTemplateToWorkout(db, workoutId, templateId);
      await reload();
    },
    [db, workoutId, reload],
  );

  return { items, rests, add, addTemplate, move, remove, group, ungroup };
}
