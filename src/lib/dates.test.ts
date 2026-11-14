import { expect, test } from 'vitest';
import { dayRange, formatWorkoutDate } from './dates';

// The exact punctuation depends on the ICU version, so check the parts.
test('show weekday, date and time in the given locale', () => {
  const date = new Date(2026, 9, 29, 9, 47);
  expect(formatWorkoutDate(date, 'en-GB')).toMatch(/^Thu,? 29 Oct 2026,? 09:47$/);
  expect(formatWorkoutDate(date, 'de-DE')).toMatch(/^Do\.,? 29\. Okt\. 2026,? 09:47$/);
});

test('give the local day around a moment, from midnight to the next midnight', () => {
  const { from, to } = dayRange(new Date(2026, 10, 15, 18, 30));
  expect(from).toEqual(new Date(2026, 10, 15));
  expect(to).toEqual(new Date(2026, 10, 16));
});

test('cross the end of a month', () => {
  expect(dayRange(new Date(2026, 9, 31, 0, 0)).to).toEqual(new Date(2026, 10, 1));
});
