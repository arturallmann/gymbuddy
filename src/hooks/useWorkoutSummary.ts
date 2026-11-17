'use client';

import { useEffect, useState } from 'react';
import { listBodyweights } from '@/db/bodyweights';
import { useDatabase } from '@/db/DatabaseContext';
import type { Bodyweight, Workout } from '@/db/schema';
import { listHistoryUpTo, listWorkoutStatistics } from '@/db/statistics';
import { getWorkout } from '@/db/workouts';
import { listWorkoutExercises, type WorkoutExerciseItem } from '@/db/workoutExercises';
import { bodyweightAt, muscleGroupSummaries, setVolume, type MuscleGroupSummary } from '@/lib/statistics';
import { byWorkout, newPersonalRecordsIn, type PersonalRecordKind } from '@/lib/personalRecords';
import { useSettings } from './useSettings';

export type WorkoutStats = {
  volume: number | null;
  sets: number;
  // Personal records by exercise id.
  records: Map<string, { kind: PersonalRecordKind; value: number }[]>;
  // Sets and volume per muscle group, for the muscle map (decision 046).
  muscleGroups: MuscleGroupSummary[];
};

export type WorkoutSummaryData = { workout: Workout; items: WorkoutExerciseItem[]; stats: WorkoutStats };

// Volume, sets and personal records of one workout, from the sets of its exercises up to it.
function workoutStats(
  workout: Workout,
  items: WorkoutExerciseItem[],
  rows: Awaited<ReturnType<typeof listHistoryUpTo>>,
  bodyweights: Bodyweight[],
  muscleGroups: MuscleGroupSummary[],
): WorkoutStats {
  const bodyweight = bodyweightAt(bodyweights, workout.startedAt);
  const own = rows.filter((row) => row.workoutId === workout.id);
  const loadTypes = new Map(items.map((item) => [item.exerciseId, item.loadType]));
  const volumes = own
    .map((row) => setVolume(row.set, loadTypes.get(row.exerciseId) ?? 'none', bodyweight))
    .filter((v): v is number => v !== null);
  const records = new Map<string, { kind: PersonalRecordKind; value: number }[]>();
  for (const item of items) {
    if (records.has(item.exerciseId)) continue;
    const history = byWorkout(rows.filter((row) => row.exerciseId === item.exerciseId));
    records.set(item.exerciseId, newPersonalRecordsIn(history, item, workout.id));
  }
  return {
    volume: volumes.length ? volumes.reduce((sum, v) => sum + v, 0) : null,
    sets: own.length,
    records,
    muscleGroups,
  };
}

// One workout with its workout exercises and statistics: the workout detail page and the
// "Workout ended" page use it. Undefined while loading, null when the workout does not exist.
export function useWorkoutSummary(id: string | null): WorkoutSummaryData | null | undefined {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const [loaded, setLoaded] = useState<{ id: string | null; data: WorkoutSummaryData | null } | undefined>(undefined);

  useEffect(() => {
    let current = true;
    const load = async (): Promise<WorkoutSummaryData | null> => {
      const workout = id ? await getWorkout(db, id) : null;
      if (!workout) return null;
      const items = await listWorkoutExercises(db, workout.id);
      const [rows, bodyweights, own] = await Promise.all([
        listHistoryUpTo(db, userId, workout),
        listBodyweights(db, userId),
        listWorkoutStatistics(db, workout.id),
      ]);
      const muscleGroups = muscleGroupSummaries({ ...own, bodyweights });
      return { workout, items, stats: workoutStats(workout, items, rows, bodyweights, muscleGroups) };
    };
    load()
      .then((data) => current && setLoaded({ id, data }))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, id]);

  return loaded?.id === id ? loaded.data : undefined;
}
