// A check mark, such as the "done" mark of the "Workout ended" page. Decoration only; the text says what it means.
export default function CheckIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
