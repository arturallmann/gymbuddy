import { isSameDay } from '@/lib/calendar';

// The number of a day in the calendar; today sits on a yellow disc (decision 040).
export default function CalendarDayNumber({ day, today }: { day: Date; today: Date }) {
  return (
    <span
      className={`grid h-7 w-7 place-items-center rounded-full tabular-nums ${
        isSameDay(day, today) ? 'bg-accent font-semibold text-on-accent' : ''
      }`}
    >
      {day.getDate()}
    </span>
  );
}
