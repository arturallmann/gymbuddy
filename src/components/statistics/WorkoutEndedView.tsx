'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useWorkoutSummary } from '@/hooks/useWorkoutSummary';
import { formatTime } from '@/lib/dates';
import { formatWorkoutDuration } from '@/lib/units';
import CheckIcon from '@/components/ui/icons/CheckIcon';
import WorkoutMuscleMap from './WorkoutMuscleMap';
import WorkoutRecordList from './WorkoutRecordList';
import WorkoutSummary from './WorkoutSummary';

const day = (date: Date) => new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(date);

// The page after "End workout" (decision 046): what the workout did, with its summary, muscle map and
// personal records. "Done" and Android Back go to the home page, which lists today's workouts.
// The workout id comes from the address: /workout/ended?id=…
export default function WorkoutEndedView() {
  const router = useRouter();
  const loaded = useWorkoutSummary(useSearchParams().get('id'));
  const done = () => router.push('/');
  useBackHandler(done, 'page');

  if (loaded === undefined) return null;
  const workout = loaded?.workout;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-5 p-6">
      {!loaded || !workout ? (
        <p className="text-muted">This workout does not exist.</p>
      ) : (
        <>
          <header className="flex flex-col items-center gap-1 pt-2 text-center">
            <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-success text-surface">
              <CheckIcon className="h-7 w-7" />
            </span>
            <h1 className="text-2xl font-semibold">Workout ended</h1>
            <p className="text-sm text-muted">
              {day(workout.startedAt)} · {formatTime(workout.startedAt)}
              {workout.endedAt &&
                `–${formatTime(workout.endedAt)} · ${formatWorkoutDuration((workout.endedAt.getTime() - workout.startedAt.getTime()) / 1000)}`}
            </p>
          </header>
          <WorkoutSummary
            volume={loaded.stats.volume}
            sets={loaded.stats.sets}
            exercises={new Set(loaded.items.map((item) => item.exerciseId)).size}
            records={[...loaded.stats.records.values()].reduce((sum, list) => sum + list.length, 0)}
          />
          {loaded.stats.muscleGroups.length > 0 && <WorkoutMuscleMap muscleGroups={loaded.stats.muscleGroups} />}
          <WorkoutRecordList items={loaded.items} records={loaded.stats.records} />
        </>
      )}
      <button type="button" onClick={done} className="rounded-lg bg-primary px-6 py-3 font-medium text-on-primary">
        Done
      </button>
    </main>
  );
}
