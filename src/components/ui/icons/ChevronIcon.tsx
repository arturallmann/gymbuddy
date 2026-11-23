// A chevron pointing left, right, up or down, for the arrows of the calendar and days that open in place.
// The button carries the name, such as "Next week".
const PATHS = {
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  up: 'M5 15l7-7 7 7',
  down: 'M5 9l7 7 7-7',
} as const;

export default function ChevronIcon({ direction, className = 'h-5 w-5' }: { direction: keyof typeof PATHS; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[direction]} />
    </svg>
  );
}
