import Link from 'next/link';
import type { WorkoutHistoryItem } from '@/db/workouts';
import { formatTime } from '@/lib/dates';
import { formatWorkoutDuration } from '@/lib/units';

// The workouts of one calendar day: time, duration, sets and exercises. Each opens its workout
// detail page, whose back arrow returns to `back`, the calendar with the same place.
export default function CalendarDayWorkouts({ items, back }: { items: WorkoutHistoryItem[]; back: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((workout) => (
        <li key={workout.id}>
          <Link
            href={`/history/workout?id=${workout.id}&back=${encodeURIComponent(back)}`}
            className="flex flex-col gap-0.5 rounded-lg border bg-page p-3"
          >
            <span className="flex items-center justify-between gap-2 font-medium">
              <span>
                {formatTime(workout.startedAt)}
                {workout.endedAt && ` · ${formatWorkoutDuration((workout.endedAt.getTime() - workout.startedAt.getTime()) / 1000)}`}
                {` · ${workout.setCount === 1 ? '1 set' : `${workout.setCount} sets`}`}
              </span>
              <span aria-hidden className="text-link">
                ›
              </span>
            </span>
            {workout.exercises.length > 0 && (
              <span className="break-words text-sm text-muted">
                {workout.exercises.map((exercise) => `${exercise.name} ×${exercise.sets}`).join(', ')}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
