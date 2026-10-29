'use client';

import type { ReactNode } from 'react';
import type { WorkoutExerciseItem } from '@/db/workouts';

type Props = {
  items: WorkoutExerciseItem[];
  onMove: (id: string, direction: 'up' | 'down') => void;
  onRemove: (id: string) => void;
  // Shown under each workout exercise, such as its sets.
  renderBody?: (item: WorkoutExerciseItem) => ReactNode;
};

// The workout exercises in order, with buttons to reorder or remove them.
export default function WorkoutExerciseList({ items, onMove, onRemove, renderBody }: Props) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li key={item.id} className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 break-words font-semibold">{item.name}</span>
            <button
              type="button"
              aria-label={`Move ${item.name} up`}
              disabled={index === 0}
              onClick={() => onMove(item.id, 'up')}
              className="px-2 text-xl disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move ${item.name} down`}
              disabled={index === items.length - 1}
              onClick={() => onMove(item.id, 'down')}
              className="px-2 text-xl disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              aria-label={`Remove ${item.name}`}
              onClick={() => onRemove(item.id)}
              className="px-2 text-red-600"
            >
              Remove
            </button>
          </div>
          {renderBody?.(item)}
        </li>
      ))}
    </ol>
  );
}
