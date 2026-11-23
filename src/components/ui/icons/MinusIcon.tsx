// A minus, drawn like PlusIcon so the − and + buttons of a number stepper match. The button carries the name.
export default function MinusIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M5 12h14" />
    </svg>
  );
}
