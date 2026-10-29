'use client';

import type { LoadType, WorkoutSet } from '@/db/schema';
import { formatSet } from '@/lib/sets';
import type { Units } from '@/lib/units';

type Props = {
  sets: WorkoutSet[];
  loadType: LoadType;
  units: Units;
  onRemove: (id: string) => void;
};

// The logged sets of one workout exercise, with every stored value and notes.
export default function SetList({ sets, loadType, units, onRemove }: Props) {
  if (sets.length === 0) {
    return null;
  }
  return (
    <ol aria-label="Sets" className="flex flex-col gap-1">
      {sets.map((set, index) => (
        <li key={set.id} className="flex items-start gap-3">
          <span className="w-6 shrink-0 text-gray-500">{index + 1}</span>
          <span className="min-w-0 flex-1 break-words">
            {formatSet(set, loadType, units)}
            {set.notes && <span className="block text-sm text-gray-500">{set.notes}</span>}
          </span>
          <button
            type="button"
            aria-label={`Remove set ${index + 1}`}
            onClick={() => onRemove(set.id)}
            className="shrink-0 px-2 text-sm text-red-600"
          >
            Remove
          </button>
        </li>
      ))}
    </ol>
  );
}
