import { expect, test } from 'vitest';
import { formatWorkoutDate } from './dates';

// The exact punctuation depends on the ICU version, so check the parts.
test('show weekday, date and time in the given locale', () => {
  const date = new Date(2026, 9, 29, 9, 47);
  expect(formatWorkoutDate(date, 'en-GB')).toMatch(/^Thu,? 29 Oct 2026,? 09:47$/);
  expect(formatWorkoutDate(date, 'de-DE')).toMatch(/^Do\.,? 29\. Okt\. 2026,? 09:47$/);
});
