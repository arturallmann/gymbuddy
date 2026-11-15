// Dates for the calendar (decision 040). All days are local days of the phone. A day key such as
// "2026-11-15" names a day in the address and in maps.
import type { Category } from '@/db/schema';

export type CalendarView = 'month' | 'week';

// The first day of the week for a locale: 0 = Sunday … 6 = Saturday. Monday when the browser
// cannot tell.
export function firstDayOfWeek(locale?: string): number {
  try {
    const info = new Intl.Locale(locale ?? navigator.language) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const firstDay = (info.getWeekInfo?.() ?? info.weekInfo)?.firstDay;
    return firstDay ? firstDay % 7 : 1;
  } catch {
    return 1;
  }
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// The day of a day key, or null when the text is not one.
export function parseDayKey(key: string | null): Date | null {
  const match = key?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return dayKey(date) === key ? date : null;
}

export const isSameDay = (a: Date | null, b: Date | null) => a !== null && b !== null && dayKey(a) === dayKey(b);

// The first day of the week that holds `date`.
export function startOfWeek(date: Date, firstDay: number): Date {
  return addDays(date, -((date.getDay() - firstDay + 7) % 7));
}

// The seven days of the week that holds `date`.
export function weekDays(date: Date, firstDay: number): Date[] {
  const start = startOfWeek(date, firstDay);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// The weeks shown for the month of `date`: whole weeks from the one with the 1st to the one with
// the last day, so 4 to 6 rows.
export function monthWeeks(date: Date, firstDay: number): Date[][] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const weeks: Date[][] = [];
  for (let start = startOfWeek(first, firstDay); start <= last; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

// The time span the calendar shows: every day on screen, from the first one to the day after the last.
export function shownSpan(view: CalendarView, date: Date, firstDay: number): { from: Date; to: Date } {
  const days = view === 'month' ? monthWeeks(date, firstDay).flat() : weekDays(date, firstDay);
  return { from: days[0], to: addDays(days[days.length - 1], 1) };
}

// The same place one month or week earlier (-1) or later (1). A month step lands on the 1st.
export function step(view: CalendarView, date: Date, direction: -1 | 1): Date {
  return view === 'month' ? new Date(date.getFullYear(), date.getMonth() + direction, 1) : addDays(date, 7 * direction);
}

// True when the month or week of `date` holds `today`.
export function showsDay(view: CalendarView, date: Date, today: Date, firstDay: number): boolean {
  return view === 'month'
    ? date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()
    : isSameDay(startOfWeek(date, firstDay), startOfWeek(today, firstDay));
}

// "November 2026", or "9–15 Nov 2026" and "30 Nov – 6 Dec 2026" for a week.
export function calendarTitle(view: CalendarView, date: Date, firstDay: number, locale?: string): string {
  if (view === 'month') {
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
  }
  const days = weekDays(date, firstDay);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).formatRange(days[0], days[6]);
}

// Short weekday names in calendar order, such as ["Mon", …, "Sun"].
export function weekdayNames(firstDay: number, locale?: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // 4 January 2026 is a Sunday.
  return Array.from({ length: 7 }, (_, i) => format.format(new Date(2026, 0, 4 + ((firstDay + i) % 7))));
}

// The categories of the exercises done, once each, in a fixed order for the bars in a day cell.
const CATEGORY_ORDER: Category[] = ['strength', 'cardio', 'stretch', 'mobility'];
export function dayCategories(workouts: { exercises: { category: Category }[] }[]): Category[] {
  const done = new Set(workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.category)));
  return CATEGORY_ORDER.filter((category) => done.has(category));
}

// The calendar address that keeps its place: view, shown day and open day.
export function calendarHref(view: CalendarView, date: Date, open: Date | null = null): string {
  return `/calendar?view=${view}&date=${dayKey(date)}${open ? `&day=${dayKey(open)}` : ''}`;
}
