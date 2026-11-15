'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { listBodyweights } from '@/db/bodyweights';
import { useDatabase } from '@/db/DatabaseContext';
import type { Bodyweight, Workout } from '@/db/schema';
import { listHistoryUpTo } from '@/db/statistics';
import { deleteWorkout, getWorkout, listWorkoutExercises, type WorkoutExerciseItem } from '@/db/workouts';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { formatWorkoutDate } from '@/lib/dates';
import { bodyweightAt, byWorkout, newPersonalRecordsIn, setVolume, type PersonalRecordKind } from '@/lib/statistics';
import { formatWorkoutDuration } from '@/lib/units';
import ConfirmAction from './ConfirmAction';
import SaveRoutine from './SaveRoutine';
import WorkoutExerciseSets from './WorkoutExerciseSets';
import BackLink from './BackLink';
import WorkoutSummary from './WorkoutSummary';

type Stats = {
  volume: number | null;
  sets: number;
  // Personal records by exercise id.
  records: Map<string, { kind: PersonalRecordKind; value: number }[]>;
};
type Loaded = { workout: Workout; items: WorkoutExerciseItem[]; stats: Stats } | null;

// Volume, sets and personal records of one workout, from the sets of its exercises up to it.
function workoutStats(
  workout: Workout,
  items: WorkoutExerciseItem[],
  rows: Awaited<ReturnType<typeof listHistoryUpTo>>,
  bodyweights: Bodyweight[],
): Stats {
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
  };
}

// One past workout with all its workout exercises and sets. With the statistics feature toggle it
// starts with a summary and marks the personal records the workout reached (decision 043).
// The workout id comes from the address: /history/workout?id=…
// Opened from the calendar, the address also holds `back`, the calendar place to return to.
export default function WorkoutDetail() {
  const db = useDatabase();
  const router = useRouter();
  const { userId } = useSettings().settings;
  const features = useFeatures();
  const params = useSearchParams();
  const id = params.get('id');
  const fromCalendar = params.get('back')?.startsWith('/calendar?') ? params.get('back')! : null;
  const backHref = fromCalendar ?? '/history';
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);

  useEffect(() => {
    let current = true;
    const load = async (): Promise<Loaded> => {
      const workout = id ? await getWorkout(db, id) : null;
      if (!workout) return null;
      const items = await listWorkoutExercises(db, workout.id);
      const [rows, bodyweights] = await Promise.all([listHistoryUpTo(db, userId, workout), listBodyweights(db, userId)]);
      return { workout, items, stats: workoutStats(workout, items, rows, bodyweights) };
    };
    load()
      .then((result) => current && setLoaded(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, id]);

  if (loaded === undefined) {
    return null;
  }
  const workout = loaded?.workout;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <BackLink href={backHref} label={fromCalendar ? 'Back to calendar' : 'Back to workout history'} />
      </header>
      {!loaded || !workout ? (
        <p className="text-muted">This workout does not exist.</p>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold">{formatWorkoutDate(workout.startedAt)}</h1>
            <p className="text-muted">
              {workout.endedAt
                ? formatWorkoutDuration((workout.endedAt.getTime() - workout.startedAt.getTime()) / 1000)
                : 'Active workout'}
            </p>
            {workout.notes && <p className="mt-2 break-words">{workout.notes}</p>}
          </div>
          {features.statistics && loaded.items.length > 0 && (
            <WorkoutSummary
              volume={loaded.stats.volume}
              sets={loaded.stats.sets}
              exercises={new Set(loaded.items.map((item) => item.exerciseId)).size}
              records={[...loaded.stats.records.values()].reduce((sum, list) => sum + list.length, 0)}
            />
          )}
          {loaded.items.length === 0 ? (
            <p className="text-muted">No exercises.</p>
          ) : (
            loaded.items.map((item, index) => (
              <WorkoutExerciseSets
                key={item.id}
                item={item}
                // An exercise twice in one workout shows its records once, on its first workout exercise.
                records={
                  features.statistics && loaded.items.findIndex((other) => other.exerciseId === item.exerciseId) === index
                    ? loaded.stats.records.get(item.exerciseId)
                    : undefined
                }
              />
            ))
          )}
          <SaveRoutine workoutId={workout.id} startedAt={workout.startedAt} />
          <ConfirmAction
            label="Delete workout"
            question="Delete this workout? Its exercises and sets are deleted."
            confirmLabel="Delete"
            keepLabel="Keep workout"
            onConfirm={async () => {
              await deleteWorkout(db, workout.id);
              router.push(backHref);
            }}
          />
        </>
      )}
    </main>
  );
}
