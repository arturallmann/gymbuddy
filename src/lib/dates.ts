// Date formatting for the interface. Dates are stored as milliseconds; this only changes the display.

// "Thu, 29 Oct 2026, 09:47" in en-GB. Without a locale it follows the phone.
export function formatWorkoutDate(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
