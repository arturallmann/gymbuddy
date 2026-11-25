import type { WorkoutHistoryItem } from '@/db/workouts';
import { calendarTitle, dayCategories, dayCellLabel, dayKey, dayLabel, isSameDay, monthWeeks, weekdayNames } from '@/lib/calendar';
import CalendarDayNumber from './CalendarDayNumber';
import CalendarDayWorkouts from './CalendarDayWorkouts';
import CategoryBars from './CategoryBars';

type Props = {
  // A day of the shown month.
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

// The month view of the calendar (decision 040): a grid of whole weeks; a day with workouts shows bars
// in the plate colors of their categories and opens a panel under the grid with its workouts.
export default function CalendarMonth({ date, firstDay, today, open, workoutsOn, back, onToggle }: Props) {
  const weeks = monthWeeks(date, firstDay);
  const names = weekdayNames(firstDay);
  const workoutsOf = (day: Date) => workoutsOn?.(day) ?? [];
  const openWorkouts = open ? workoutsOf(open) : [];
  return (
    <>
      <div role="grid" aria-label={calendarTitle('month', date, firstDay)} className="flex flex-col gap-0.5">
        <div role="row" className="grid grid-cols-7 text-center text-xs font-medium text-muted">
          {names.map((name) => (
            <span key={name} role="columnheader" className="py-1">
              {name}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={dayKey(week[0])} role="row" className="grid grid-cols-7 gap-0.5">
            {week.map((day) => {
              const workouts = workoutsOf(day);
              const outside = day.getMonth() !== date.getMonth();
              const cell = `flex h-12 flex-col items-center gap-1 rounded-lg pt-1 text-sm ${outside ? 'text-line-strong' : ''}`;
              const content = (
                <>
                  <CalendarDayNumber day={day} today={today} />
                  <CategoryBars categories={dayCategories(workouts)} hasWorkout={workouts.length > 0} />
                </>
              );
              return workouts.length > 0 ? (
                <button
                  key={dayKey(day)}
                  type="button"
                  role="gridcell"
                  aria-label={dayCellLabel(day, today, workouts.length)}
                  aria-expanded={isSameDay(day, open)}
                  onClick={() => onToggle(day)}
                  className={`${cell} ${isSameDay(day, open) ? 'bg-surface ring-1 ring-line-strong' : ''}`}
                >
                  {content}
                </button>
              ) : (
                <span key={dayKey(day)} role="gridcell" aria-label={dayCellLabel(day, today, 0)} className={cell}>
                  {content}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      {open && openWorkouts.length > 0 ? (
        <section aria-label={dayLabel(open)} className="flex flex-col gap-2 rounded-lg border bg-surface p-3">
          <h2 className="text-sm font-medium text-muted">{dayLabel(open)}</h2>
          <CalendarDayWorkouts items={openWorkouts} back={back} />
        </section>
      ) : (
        workoutsOn && <p className="text-sm text-muted">Tap a day with a bar to see its workouts.</p>
      )}
    </>
  );
}
