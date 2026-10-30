import Link from 'next/link';
import type { WorkoutHistoryItem } from '@/db/workouts';
import { formatWorkoutDate } from '@/lib/dates';
import { formatWorkoutDuration } from '@/lib/units';

// Ended workouts, newest first. Each links to its workout detail page.
export default function WorkoutHistoryList({ items }: { items: WorkoutHistoryItem[] }) {
  if (items.length === 0) {
    return <p className="text-gray-500">No workouts yet.</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {items.map((workout) => (
        <li key={workout.id}>
          <Link href={`/history/workout?id=${workout.id}`} className="block rounded-lg border p-3">
            <span className="block font-semibold">{formatWorkoutDate(workout.startedAt)}</span>
            <span className="block text-sm text-gray-500">
              {workout.endedAt && formatWorkoutDuration((workout.endedAt.getTime() - workout.startedAt.getTime()) / 1000)}
              {' · '}
              {workout.setCount === 1 ? '1 set' : `${workout.setCount} sets`}
            </span>
            {workout.exerciseNames.length > 0 && (
              <span className="block break-words text-sm">{workout.exerciseNames.join(', ')}</span>
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}
