'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useDatabase } from '@/db/DatabaseContext';
import { deleteWorkout } from '@/db/workouts';
import { useFeatures } from '@/hooks/useSettings';
import { useWorkoutSummary } from '@/hooks/useWorkoutSummary';
import { formatWorkoutDate } from '@/lib/dates';
import { formatWorkoutDuration } from '@/lib/units';
import ConfirmAction from '@/components/ui/ConfirmAction';
import SaveRoutine from '@/components/templates/SaveRoutine';
import WorkoutExerciseSets from './WorkoutExerciseSets';
import BackLink from '@/components/ui/BackLink';
import WorkoutMuscleMap from '@/components/statistics/WorkoutMuscleMap';
import WorkoutSummary from '@/components/statistics/WorkoutSummary';

// One past workout with all its workout exercises and sets. With the statistics feature toggle it
// starts with a summary and the muscle map, and marks the personal records the workout reached
// (decisions 043 and 046).
// The workout id comes from the address: /history/workout?id=…
// Opened from the calendar, the address also holds `back`, the calendar place to return to.
export default function WorkoutDetail() {
  const db = useDatabase();
  const router = useRouter();
  const features = useFeatures();
  const params = useSearchParams();
  const fromCalendar = params.get('back')?.startsWith('/calendar?') ? params.get('back')! : null;
  const backHref = fromCalendar ?? '/history';
  const loaded = useWorkoutSummary(params.get('id'));

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
          {features.statistics && loaded.stats.muscleGroups.length > 0 && <WorkoutMuscleMap muscleGroups={loaded.stats.muscleGroups} />}
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
