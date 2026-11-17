'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';

type Props = {
  id: string;
  // Off while the user chooses workout exercises for a superset.
  disabled: boolean;
  className: string;
  'aria-label'?: string;
  children: ReactNode;
};

// One card in the workout exercise list that can be dragged (4b.1): from the handle on the right
// at once, or with a long press anywhere on the card.
export default function SortableBlock({ id, disabled, className, children, ...rest }: Props) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <li
      ref={setNodeRef}
      aria-label={rest['aria-label']}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`${className} select-none [-webkit-touch-callout:none] ${isDragging ? 'relative z-10 shadow-lg' : ''}`}
      {...listeners}
    >
      {children}
      {!disabled && (
        <span data-drag-handle aria-hidden className="-mr-1 shrink-0 cursor-grab touch-none p-2 text-muted">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            {[6, 12, 18].flatMap((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} />))}
          </svg>
        </span>
      )}
    </li>
  );
}
