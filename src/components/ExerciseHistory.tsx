import Link from 'next/link';
import type { LoadType } from '@/db/schema';
import { formatWorkoutDate } from '@/lib/dates';
import type { HistoryWorkout } from '@/lib/progress';
import type { Units } from '@/lib/units';
import SetList from './SetList';

type Props = {
  workouts: HistoryWorkout[];
  loadType: LoadType;
  units: Units;
};

// The history view: every set of one exercise, newest workout first, with all values and notes.
export default function ExerciseHistory({ workouts, loadType, units }: Props) {
  if (workouts.length === 0) {
    return <p className="text-gray-500">No sets yet.</p>;
  }
  return (
    <ol aria-label="History" className="flex flex-col gap-4">
      {workouts.map((workout) => (
        <li key={workout.workoutId} className="flex flex-col gap-2">
          <Link href={`/history/workout?id=${workout.workoutId}`} className="text-sm font-semibold text-sky-600">
            {formatWorkoutDate(workout.startedAt)}
          </Link>
          {workout.items.map((item) => (
            <div key={item.workoutExerciseId} className="flex flex-col gap-1">
              {item.notes && <p className="break-words text-sm text-gray-500">{item.notes}</p>}
              <SetList sets={item.sets} loadType={loadType} units={units} />
            </div>
          ))}
        </li>
      ))}
    </ol>
  );
}
