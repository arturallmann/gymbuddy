'use client';

import type { LoadType, WorkoutSet } from '@/db/schema';
import { formatSet } from '@/lib/sets';
import type { Units } from '@/lib/units';

type Props = {
  sets: WorkoutSet[];
  loadType: LoadType;
  units: Units;
  // Without onRemove and onEdit the list is read-only, as in the workout history.
  onRemove?: (id: string) => void;
  // Tapping a set opens it for editing.
  onEdit?: (id: string) => void;
  editingId?: string | null;
};

// The logged sets of one workout exercise, with every stored value and notes.
export default function SetList({ sets, loadType, units, onRemove, onEdit, editingId }: Props) {
  if (sets.length === 0) {
    return null;
  }
  return (
    <ol aria-label="Sets" className="flex flex-col gap-1">
      {sets.map((set, index) => {
        const text = (
          <>
            {formatSet(set, loadType, units)}
            {set.notes && <span className="block text-sm text-gray-500">{set.notes}</span>}
          </>
        );
        return (
          <li key={set.id} className="flex items-start gap-3">
            <span className="w-6 shrink-0 text-gray-500">{index + 1}</span>
            {onEdit ? (
              <button
                type="button"
                aria-label={`Edit set ${index + 1}`}
                aria-pressed={editingId === set.id}
                onClick={() => onEdit(set.id)}
                className={`min-w-0 flex-1 break-words rounded text-left ${editingId === set.id ? 'text-sky-400' : ''}`}
              >
                {text}
              </button>
            ) : (
              <span className="min-w-0 flex-1 break-words">
                {text}
              </span>
            )}
            {onRemove && (
              <button
                type="button"
                aria-label={`Remove set ${index + 1}`}
                onClick={() => onRemove(set.id)}
                className="shrink-0 px-2 text-sm text-red-600"
              >
                Remove
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
