import { describe, expect, test } from 'vitest';
import {
  calendarHref,
  calendarTitle,
  dayCategories,
  dayCellLabel,
  dayLabel,
  dayKey,
  firstDayOfWeek,
  monthWeeks,
  parseDayKey,
  showsDay,
  shownSpan,
  startOfWeek,
  step,
  weekDays,
  weekdayNames,
} from './calendar';

const MONDAY = 1;
const SUNDAY = 0;
const day = (m: number, d: number, y = 2026) => new Date(y, m - 1, d);
const keys = (days: Date[]) => days.map(dayKey);

describe('weeks', () => {
  test('start the week on the first day of the locale', () => {
    expect(firstDayOfWeek('en-GB')).toBe(MONDAY);
    expect(firstDayOfWeek('en-US')).toBe(SUNDAY);
    expect(firstDayOfWeek('not a locale!')).toBe(MONDAY);
  });

  test('find the week of a day', () => {
    expect(dayKey(startOfWeek(day(11, 15), MONDAY))).toBe('2026-11-09');
    expect(dayKey(startOfWeek(day(11, 15), SUNDAY))).toBe('2026-11-15');
    expect(keys(weekDays(day(11, 15), MONDAY))).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15',
    ]);
  });

  test('show the whole weeks of a month', () => {
    const weeks = monthWeeks(day(11, 15), MONDAY);
    expect(weeks).toHaveLength(6);
    expect(dayKey(weeks[0][0])).toBe('2026-10-26');
    expect(dayKey(weeks[5][6])).toBe('2026-12-06');
    // February 2027 starts on a Monday and has exactly four weeks.
    expect(monthWeeks(day(2, 10, 2027), MONDAY)).toHaveLength(4);
  });

  test('load every day on screen', () => {
    expect(keys(Object.values(shownSpan('month', day(11, 15), MONDAY)))).toEqual(['2026-10-26', '2026-12-07']);
    expect(keys(Object.values(shownSpan('week', day(11, 15), MONDAY)))).toEqual(['2026-11-09', '2026-11-16']);
  });
});

describe('moving', () => {
  test('step a month to its 1st, or a week by seven days, across years', () => {
    expect(dayKey(step('month', day(1, 31), -1))).toBe('2025-12-01');
    expect(dayKey(step('month', day(11, 15), 1))).toBe('2026-12-01');
    expect(dayKey(step('week', day(12, 29), 1))).toBe('2027-01-05');
  });

  test('know whether today is on screen', () => {
    const today = day(11, 15);
    expect(showsDay('month', day(11, 1), today, MONDAY)).toBe(true);
    expect(showsDay('month', day(10, 15), today, MONDAY)).toBe(false);
    expect(showsDay('week', day(11, 9), today, MONDAY)).toBe(true);
    expect(showsDay('week', day(11, 16), today, MONDAY)).toBe(false);
  });
});

describe('labels', () => {
  test('name the month or the week', () => {
    expect(calendarTitle('month', day(11, 15), MONDAY, 'en-GB')).toBe('November 2026');
    // The browser puts (thin) spaces around the dash or not, depending on its version.
    expect(calendarTitle('week', day(11, 15), MONDAY, 'en-GB')).toMatch(/^9\s?–\s?15 Nov 2026$/);
    expect(calendarTitle('week', day(12, 1), MONDAY, 'en-GB')).toMatch(/^30 Nov\s?–\s?6 Dec 2026$/);
  });

  test('name a day with today and its number of workouts', () => {
    expect(dayLabel(day(11, 15), 'en-GB')).toBe('Sunday 15 November');
    expect(dayCellLabel(day(11, 15), day(11, 15), 0, 'en-GB')).toBe('Sunday 15 November, today');
    expect(dayCellLabel(day(11, 14), day(11, 15), 1, 'en-GB')).toBe('Saturday 14 November, 1 workout');
    expect(dayCellLabel(day(11, 15), day(11, 15), 2, 'en-GB')).toBe('Sunday 15 November, today, 2 workouts');
  });

  test('name the weekdays in calendar order', () => {
    expect(weekdayNames(MONDAY, 'en-GB')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(weekdayNames(SUNDAY, 'en-GB')[0]).toBe('Sun');
  });
});

test('read only real days from the address', () => {
  expect(dayKey(parseDayKey('2026-11-15')!)).toBe('2026-11-15');
  expect(parseDayKey('2026-02-30')).toBeNull();
  expect(parseDayKey('tomorrow')).toBeNull();
  expect(parseDayKey(null)).toBeNull();
});

test('list the categories of a day once each, in a fixed order', () => {
  const workouts = [
    { exercises: [{ category: 'stretch' as const }, { category: 'strength' as const }] },
    { exercises: [{ category: 'strength' as const }, { category: 'cardio' as const }] },
  ];
  expect(dayCategories(workouts)).toEqual(['strength', 'cardio', 'stretch']);
  expect(dayCategories([])).toEqual([]);
});

test('keep the calendar place in the address', () => {
  expect(calendarHref('week', new Date(2026, 10, 15))).toBe('/calendar?view=week&date=2026-11-15');
  expect(calendarHref('month', new Date(2026, 10, 1), new Date(2026, 10, 4))).toBe('/calendar?view=month&date=2026-11-01&day=2026-11-04');
});
