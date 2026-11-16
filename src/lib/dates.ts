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

// The local day that holds `date`: from midnight to the next midnight, in the phone's time zone.
export function dayRange(date: Date): { from: Date; to: Date } {
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const to = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return { from, to };
}

// "18:05" in en-GB, "6:05 PM" in en-US. Without a locale it follows the phone.
export function formatTime(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}
