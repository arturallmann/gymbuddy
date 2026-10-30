'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { WorkoutExerciseItem } from '@/db/workouts';
import { toBlocks } from '@/lib/blocks';

// While the user picks workout exercises for a superset, single workout exercises show a checkbox.
export type Selection = {
  chosen: string[];
  onToggle: (id: string) => void;
  canChoose: (item: WorkoutExerciseItem) => boolean;
};

type Props = {
  items: WorkoutExerciseItem[];
  onMove: (id: string, direction: 'up' | 'down') => void;
  onRemove: (id: string) => void;
  // Shown under the name, inside the link to the workout exercise page, such as a summary of its sets.
  renderBody?: (item: WorkoutExerciseItem) => ReactNode;
  // The inside of an exercise group's card, such as its rounds. It links to the group page.
  renderGroup?: (members: WorkoutExerciseItem[]) => ReactNode;
  // Without onUngroup, a group card has no Ungroup button (supersets feature toggle off).
  onUngroup?: (groupId: string) => void;
  selection?: Selection;
};

const arrow = 'shrink-0 px-2 text-xl disabled:opacity-30';

// The workout exercises in order. A single workout exercise links to its own page; an exercise
// group is one card that links to the group page. Both move up or down as one block.
export default function WorkoutExerciseList({
  items,
  onMove,
  onRemove,
  renderBody,
  renderGroup,
  onUngroup,
  selection,
}: Props) {
  const blocks = toBlocks(items);
  return (
    <ol className="flex flex-col gap-2">
      {blocks.map((block, index) => {
        const first = block.kind === 'single' ? block.item : block.items[0];
        const name = block.kind === 'single' ? block.item.name : block.items.map((item) => item.name).join(' + ');
        const arrows = !selection && (
          <>
            <button
              type="button"
              aria-label={`Move ${name} up`}
              disabled={index === 0}
              onClick={() => onMove(first.id, 'up')}
              className={arrow}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move ${name} down`}
              disabled={index === blocks.length - 1}
              onClick={() => onMove(first.id, 'down')}
              className={arrow}
            >
              ↓
            </button>
          </>
        );

        if (block.kind === 'group') {
          return (
            <li
              key={block.groupId}
              aria-label={`Superset: ${name}`}
              className="flex items-center gap-2 rounded-lg border border-sky-700 p-3"
            >
              <Link href={`/workout/group?id=${block.groupId}`} className="min-w-0 flex-1 break-words">
                {renderGroup ? renderGroup(block.items) : <span className="font-semibold">{name}</span>}
              </Link>
              {arrows}
              {onUngroup && !selection && (
                <button type="button" onClick={() => onUngroup(block.groupId)} className="shrink-0 px-2 text-sm text-sky-600">
                  Ungroup
                </button>
              )}
            </li>
          );
        }

        const item = block.item;
        if (selection) {
          return (
            <li key={item.id} className="rounded-lg border p-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selection.chosen.includes(item.id)}
                  disabled={!selection.canChoose(item)}
                  onChange={() => selection.onToggle(item.id)}
                  className="h-5 w-5 shrink-0"
                />
                <span className="min-w-0 flex-1 break-words font-semibold">{item.name}</span>
              </label>
            </li>
          );
        }
        return (
          <li key={item.id} className="flex items-center gap-2 rounded-lg border p-3">
            <Link href={`/workout/exercise?id=${item.id}`} className="min-w-0 flex-1 break-words">
              <span className="font-semibold">{item.name}</span>
              {renderBody?.(item)}
            </Link>
            {arrows}
            <button
              type="button"
              aria-label={`Remove ${item.name}`}
              onClick={() => onRemove(item.id)}
              className="shrink-0 px-2 text-red-600"
            >
              Remove
            </button>
          </li>
        );
      })}
    </ol>
  );
}
