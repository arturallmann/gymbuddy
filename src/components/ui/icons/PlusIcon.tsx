// A plus, drawn so it sits in the exact center of its button; a "+" in text sits lower than the
// center in many fonts (5.2.5). The button carries the name, such as "Add exercise".
export default function PlusIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
