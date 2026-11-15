'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listWorkoutHistory, type WorkoutHistoryItem } from '@/db/workouts';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useSettings } from '@/hooks/useSettings';
import {
  calendarHref,
  calendarTitle,
  dayCategories,
  dayKey,
  firstDayOfWeek,
  isSameDay,
  monthWeeks,
  parseDayKey,
  showsDay,
  shownSpan,
  step,
  weekDays,
  weekdayNames,
  type CalendarView as View,
} from '@/lib/calendar';
import BackLink from './BackLink';
import CalendarDayWorkouts from './CalendarDayWorkouts';
import CategoryBars from './CategoryBars';
import OptionGroup from './OptionGroup';

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
];

// A swipe this far sideways, and clearly more sideways than down, changes the month or week.
const SWIPE_PX = 60;

const dayLabel = (date: Date) => new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(date);

// The calendar of ended workouts (4b.9, decision 040): a month or week view with arrows, a swipe and a
// "Today" button. Today is marked; a day with workouts shows small bars in the plate colors of their
// categories and opens to list them. The place lives in the address (/calendar?view=…&date=…&day=…),
// so the back arrow of a workout opened from here returns to the same place.
export default function CalendarView() {
  const db = useDatabase();
  const router = useRouter();
  const { userId } = useSettings().settings;
  const params = useSearchParams();
  const [today] = useState(() => new Date());
  const [firstDay] = useState(() => firstDayOfWeek());
  const [view, setView] = useState<View>(() => (params.get('view') === 'week' ? 'week' : 'month'));
  const [date, setDate] = useState<Date>(() => parseDayKey(params.get('date')) ?? today);
  const [open, setOpen] = useState<Date | null>(() => parseDayKey(params.get('day')));
  const [loaded, setLoaded] = useState<{ key: string; byDay: Map<string, WorkoutHistoryItem[]> } | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const dateKey = dayKey(date);
  const spanKey = `${view}:${dateKey}`;
  useEffect(() => {
    let current = true;
    listWorkoutHistory(db, userId, shownSpan(view, parseDayKey(dateKey)!, firstDay))
      .then((items) => {
        if (!current) return;
        const byDay = new Map<string, WorkoutHistoryItem[]>();
        // Oldest first within a day.
        for (const item of [...items].reverse()) {
          const key = dayKey(item.startedAt);
          byDay.set(key, [...(byDay.get(key) ?? []), item]);
        }
        setLoaded({ key: `${view}:${dateKey}`, byDay });
      })
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, view, dateKey, firstDay]);

  const go = (nextView: View, nextDate: Date, nextOpen: Date | null) => {
    setView(nextView);
    setDate(nextDate);
    setOpen(nextOpen);
    router.replace(calendarHref(nextView, nextDate, nextOpen));
  };
  const move = (direction: -1 | 1) => go(view, step(view, date, direction), null);
  const toggle = (day: Date) => go(view, date, isSameDay(day, open) ? null : day);
  useBackHandler(open ? () => go(view, date, null) : null);

  const byDay = loaded?.key === spanKey ? loaded.byDay : null;
  const workoutsOn = (day: Date) => byDay?.get(dayKey(day)) ?? [];
  const back = calendarHref(view, date, open);
  const names = weekdayNames(firstDay);

  const label = (day: Date) => {
    const count = workoutsOn(day).length;
    return [dayLabel(day), isSameDay(day, today) ? 'today' : null, count ? `${count} workout${count > 1 ? 's' : ''}` : null]
      .filter(Boolean)
      .join(', ');
  };

  const onTouchEnd = (event: TouchEvent) => {
    const start = touch.current;
    const end = event.changedTouches[0];
    touch.current = null;
    if (!start || !end) return;
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
  };

  const dayNumber = (day: Date) => (
    <span
      className={`grid h-7 w-7 place-items-center rounded-full tabular-nums ${
        isSameDay(day, today) ? 'bg-accent font-bold text-on-accent' : ''
      }`}
    >
      {day.getDate()}
    </span>
  );

  const monthGrid = () => {
    const weeks = monthWeeks(date, firstDay);
    const openWorkouts = open ? workoutsOn(open) : [];
    return (
      <>
        <div role="grid" aria-label={calendarTitle('month', date, firstDay)} className="flex flex-col gap-0.5">
          <div role="row" className="grid grid-cols-7 text-center text-xs font-semibold text-muted">
            {names.map((name) => (
              <span key={name} role="columnheader" className="py-1">
                {name}
              </span>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={dayKey(week[0])} role="row" className="grid grid-cols-7 gap-0.5">
              {week.map((day) => {
                const workouts = workoutsOn(day);
                const outside = day.getMonth() !== date.getMonth();
                const cell = `flex h-12 flex-col items-center gap-1 rounded-lg pt-1 text-sm ${outside ? 'text-line-strong' : ''}`;
                const content = (
                  <>
                    {dayNumber(day)}
                    <CategoryBars categories={dayCategories(workouts)} hasWorkout={workouts.length > 0} />
                  </>
                );
                return workouts.length > 0 ? (
                  <button
                    key={dayKey(day)}
                    type="button"
                    role="gridcell"
                    aria-label={label(day)}
                    aria-expanded={isSameDay(day, open)}
                    onClick={() => toggle(day)}
                    className={`${cell} ${isSameDay(day, open) ? 'bg-surface ring-1 ring-line-strong' : ''}`}
                  >
                    {content}
                  </button>
                ) : (
                  <span key={dayKey(day)} role="gridcell" aria-label={label(day)} className={cell}>
                    {content}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        {open && openWorkouts.length > 0 ? (
          <section aria-label={dayLabel(open)} className="flex flex-col gap-2 rounded-lg border bg-surface p-3">
            <h2 className="text-sm font-semibold uppercase text-muted">{dayLabel(open)}</h2>
            <CalendarDayWorkouts items={openWorkouts} back={back} />
          </section>
        ) : (
          byDay && <p className="text-sm text-muted">Tap a day with a bar to see its workouts.</p>
        )}
      </>
    );
  };

  const weekList = () => (
    <ol className="flex flex-col gap-2">
      {weekDays(date, firstDay).map((day, index) => {
        const workouts = workoutsOn(day);
        const expanded = isSameDay(day, open);
        const exerciseNames = workouts.flatMap((workout) => workout.exerciseNames);
        return (
          <li key={dayKey(day)} className="rounded-lg border border-line bg-surface">
            <button
              type="button"
              disabled={workouts.length === 0}
              aria-label={label(day)}
              aria-expanded={workouts.length > 0 ? expanded : undefined}
              onClick={() => toggle(day)}
              className="flex w-full items-center gap-3 p-2 text-left"
            >
              <span className="flex w-10 shrink-0 flex-col items-center text-xs font-semibold uppercase text-muted">
                {names[index]}
                <span className="text-base normal-case text-ink">{dayNumber(day)}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <CategoryBars categories={dayCategories(workouts)} hasWorkout={workouts.length > 0} />
                <span className="truncate text-sm text-muted">{workouts.length > 0 ? exerciseNames.join(', ') : day > today ? '' : 'Rest day'}</span>
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

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-6">
      <header className="flex items-center gap-4">
        <BackLink href="/" label="Back" />
        <h1 className="min-w-0 flex-1 text-2xl font-bold">Calendar</h1>
        {!showsDay(view, date, today, firstDay) && (
          <button
            type="button"
            onClick={() => go(view, today, null)}
            className="shrink-0 rounded-full border bg-surface px-3 py-1 text-sm font-semibold text-link"
          >
            Today
          </button>
        )}
      </header>
      <OptionGroup label="View" hideLabel options={VIEW_OPTIONS} value={view} onChange={(next) => go(next, date, null)} />
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Previous ${view}`}
          onClick={() => move(-1)}
          className="h-10 w-10 rounded-lg border bg-surface text-lg"
        >
          ‹
        </button>
        <p aria-live="polite" className="flex-1 text-center font-semibold tabular-nums">
          {calendarTitle(view, date, firstDay)}
        </p>
        <button type="button" aria-label={`Next ${view}`} onClick={() => move(1)} className="h-10 w-10 rounded-lg border bg-surface text-lg">
          ›
        </button>
      </div>
      <div
        className="flex flex-col gap-3"
        onTouchStart={(event) => {
          const point = event.touches[0];
          touch.current = point ? { x: point.clientX, y: point.clientY } : null;
        }}
        onTouchEnd={onTouchEnd}
      >
        {view === 'month' ? monthGrid() : weekList()}
      </div>
    </main>
  );
}
