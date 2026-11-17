'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listWorkoutHistory, type WorkoutHistoryItem } from '@/db/workouts';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useSwipe } from '@/hooks/useSwipe';
import { slideClass } from '@/lib/swipe';
import { useSettings } from '@/hooks/useSettings';
import {
  calendarHref,
  calendarTitle,
  dayKey,
  firstDayOfWeek,
  isSameDay,
  parseDayKey,
  showsDay,
  shownSpan,
  step,
  type CalendarView as View,
} from '@/lib/calendar';
import BackLink from '@/components/ui/BackLink';
import CalendarMonth from './CalendarMonth';
import CalendarWeek from './CalendarWeek';
import OptionGroup from '@/components/ui/OptionGroup';

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
];

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
  // Without a place in the address the calendar opens on the current week (decision 041).
  const [view, setView] = useState<View>(() => (params.get('view') === 'month' ? 'month' : 'week'));
  const [date, setDate] = useState<Date>(() => parseDayKey(params.get('date')) ?? today);
  const [open, setOpen] = useState<Date | null>(() => parseDayKey(params.get('day')));
  // Which way the shown month or week moved last, for the slide (decision 045).
  const [moved, setMoved] = useState<-1 | 1 | null>(null);
  const [loaded, setLoaded] = useState<{ key: string; byDay: Map<string, WorkoutHistoryItem[]> } | null>(null);

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
    if (nextView !== view) setMoved(null);
    else if (!showsDay(view, date, nextDate, firstDay)) setMoved(nextDate > date ? 1 : -1);
    setView(nextView);
    setDate(nextDate);
    setOpen(nextOpen);
    router.replace(calendarHref(nextView, nextDate, nextOpen));
  };
  const move = (direction: -1 | 1) => go(view, step(view, date, direction), null);
  const toggle = (day: Date) => go(view, date, isSameDay(day, open) ? null : day);
  useBackHandler(open ? () => go(view, date, null) : null);
  // A sideways swipe changes the month or week.
  const swipe = useSwipe(move);

  const byDay = loaded?.key === spanKey ? loaded.byDay : null;
  const workoutsOn = byDay ? (day: Date) => byDay.get(dayKey(day)) ?? [] : null;
  const back = calendarHref(view, date, open);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 overflow-x-clip p-6">
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
      <div key={spanKey} className={`flex flex-col gap-3 ${slideClass(moved)}`} {...swipe}>
        {view === 'month' ? (
          <CalendarMonth date={date} firstDay={firstDay} today={today} open={open} workoutsOn={workoutsOn} back={back} onToggle={toggle} />
        ) : (
          <CalendarWeek date={date} firstDay={firstDay} today={today} open={open} workoutsOn={workoutsOn} back={back} onToggle={toggle} />
        )}
      </div>
    </main>
  );
}
