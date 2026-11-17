import type { WorkoutHistoryItem } from '@/db/workouts';
import { dayCategories, dayCellLabel, dayKey, isSameDay, weekDays, weekdayNames } from '@/lib/calendar';
import CalendarDayNumber from './CalendarDayNumber';
import CalendarDayWorkouts from './CalendarDayWorkouts';
import CategoryBars from './CategoryBars';

type Props = {
  // A day of the shown week.
  date: Date;
  firstDay: number;
  today: Date;
  // The day whose workouts are open, or null.
  open: Date | null;
  // The workouts of a day, oldest first; null while they load.
  workoutsOn: ((day: Date) => WorkoutHistoryItem[]) | null;
  // The calendar address, for the back arrow of an opened workout.
  back: string;
  onToggle: (day: Date) => void;
};

// The week view of the calendar (decision 040): the seven days with bars and exercise names; a day without
// a workout stays empty (decision 050). A day with workouts opens in place to list them.
export default function CalendarWeek({ date, firstDay, today, open, workoutsOn, back, onToggle }: Props) {
  const names = weekdayNames(firstDay);
  return (
    <ol className="flex flex-col gap-2">
      {weekDays(date, firstDay).map((day, index) => {
        const workouts = workoutsOn?.(day) ?? [];
        const expanded = isSameDay(day, open);
        const exerciseNames = workouts.flatMap((workout) => workout.exerciseNames);
        return (
          <li key={dayKey(day)} className="rounded-lg border border-line bg-surface">
            <button
              type="button"
              disabled={workouts.length === 0}
              aria-label={dayCellLabel(day, today, workouts.length)}
              aria-expanded={workouts.length > 0 ? expanded : undefined}
              onClick={() => onToggle(day)}
              className="flex w-full items-center gap-3 p-2 text-left"
            >
              <span className="flex w-10 shrink-0 flex-col items-center text-xs font-semibold uppercase text-muted">
                {names[index]}
                <span className="text-base normal-case text-ink">
                  <CalendarDayNumber day={day} today={today} />
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <CategoryBars categories={dayCategories(workouts)} hasWorkout={workouts.length > 0} />
                <span className="truncate text-sm text-muted">{exerciseNames.join(', ')}</span>
              </span>
              {workouts.length > 0 && (
                <span aria-hidden className="text-muted">
                  {expanded ? '▴' : '▾'}
                </span>
              )}
            </button>
            {expanded && (
              <div className="px-2 pb-2">
                <CalendarDayWorkouts items={workouts} back={back} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
