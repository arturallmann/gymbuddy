import Link from 'next/link';

// The back arrow at the top left of a page. It has no text next to it, so long page titles
// keep their room; `label` names it for screen readers, such as "Back to workout".
export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="-ml-2 shrink-0 rounded-lg p-2 text-link">
      <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
    </Link>
  );
}
