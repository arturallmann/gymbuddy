'use client';

import { DndContext, closestCenter, useSensor, useSensors, type DragEndEvent, type Modifier } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';
import type { WorkoutExerciseItem } from '@/db/workouts';
import { toBlocks, type Block } from '@/lib/blocks';
import { HandleSensor, LONG_PRESS, LongPressSensor } from '@/lib/dragSensors';
import { useBackHandler } from '@/hooks/useBackHandler';
import SortableBlock from './SortableBlock';
import TrashIcon from './icons/TrashIcon';

// While the user picks workout exercises for a superset, single workout exercises show a checkbox.
export type Selection = {
  chosen: string[];
  onToggle: (id: string) => void;
  canChoose: (item: WorkoutExerciseItem) => boolean;
};

type Props = {
  items: WorkoutExerciseItem[];
  onMove: (id: string, direction: 'up' | 'down') => void;
  // After a drag: the block of this workout exercise goes to block index `to`.
  onMoveTo: (id: string, to: number) => void;
  onRemove: (id: string) => void;
  // Shown under the name, inside the link to the workout exercise page, such as a summary of its sets.
  renderBody?: (item: WorkoutExerciseItem) => ReactNode;
  // The inside of an exercise group's card, such as its rounds. It links to the group page.
  renderGroup?: (members: WorkoutExerciseItem[]) => ReactNode;
  // Without onUngroup, a group card has no Ungroup button (supersets feature toggle off).
  onUngroup?: (groupId: string) => void;
  selection?: Selection;
};

// The ↑ and ↓ buttons stay for screen readers and keyboards; on screen, cards move by dragging.
const arrow = 'sr-only focus:not-sr-only shrink-0 px-2 text-xl disabled:opacity-30';

// Cards move only up and down.
const upAndDown: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const keyOf = (block: Block<WorkoutExerciseItem>) => (block.kind === 'single' ? block.item.id : block.groupId);

// The workout exercises in order. A single workout exercise links to its own page; an exercise
// group is one card that links to the group page. Removing a workout exercise asks first (4b.3). Both move as one block: by dragging (4b.1),
// or with the ↑ and ↓ buttons for screen readers.
export default function WorkoutExerciseList({
  items,
  onMove,
  onMoveTo,
  onRemove,
  renderBody,
  renderGroup,
  onUngroup,
  selection,
}: Props) {
  const sensors = useSensors(useSensor(HandleSensor), useSensor(LongPressSensor, { activationConstraint: LONG_PRESS }));
  // The order right after a drop, until the saved order arrives as new items.
  const [dropped, setDropped] = useState<{ items: WorkoutExerciseItem[]; keys: string[] } | null>(null);
  // A long press ends with a tap on the card; it must not open the workout exercise.
  const justDragged = useRef(false);
  // The workout exercise whose remove waits for the confirm step (4b.3): it takes all its sets along.
  const [removing, setRemoving] = useState<string | null>(null);
  useBackHandler(removing ? () => setRemoving(null) : null);

  const loaded = toBlocks(items);
  const blocks =
    dropped?.items === items
      ? dropped.keys.map((key) => loaded.find((block) => keyOf(block) === key)!)
      : loaded;
  const keys = blocks.map(keyOf);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    if (!over || active.id === over.id) return;
    const from = keys.indexOf(String(active.id));
    const to = keys.indexOf(String(over.id));
    setDropped({ items, keys: arrayMove(keys, from, to) });
    const block = blocks[from];
    onMoveTo(block.kind === 'single' ? block.item.id : block.items[0].id, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[upAndDown]} onDragEnd={onDragEnd}>
      <SortableContext items={keys} strategy={verticalListSortingStrategy}>
        <ol
          className="flex flex-col gap-2"
          onClickCapture={(event) => {
            if (justDragged.current) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
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
                <SortableBlock
                  key={block.groupId}
                  id={block.groupId}
                  disabled={Boolean(selection)}
                  aria-label={`Superset: ${name}`}
                  className="flex items-center gap-2 rounded-lg border border-primary bg-surface p-3"
                >
                  <Link href={`/workout/group?id=${block.groupId}`} className="min-w-0 flex-1 break-words">
                    {renderGroup ? renderGroup(block.items) : <span className="font-semibold">{name}</span>}
                  </Link>
                  {arrows}
                  {onUngroup && !selection && (
                    <button type="button" onClick={() => onUngroup(block.groupId)} className="shrink-0 px-2 text-sm text-link">
                      Ungroup
                    </button>
                  )}
                </SortableBlock>
              );
            }

            const item = block.item;
            if (selection) {
              return (
                <SortableBlock key={item.id} id={item.id} disabled className="rounded-lg border bg-surface p-3">
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
                </SortableBlock>
              );
            }
            if (removing === item.id) {
              return (
                <SortableBlock key={item.id} id={item.id} disabled className="rounded-lg border border-danger bg-surface p-3">
                  <div role="group" aria-label={`Remove ${item.name}`} className="flex flex-col gap-3">
                    <p className="break-words">Remove {item.name} and its sets from this workout?</p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setRemoving(null);
                          onRemove(item.id);
                        }}
                        className="flex-1 rounded-lg bg-danger px-4 py-2 font-semibold text-on-danger"
                      >
                        Remove
                      </button>
                      <button type="button" onClick={() => setRemoving(null)} className="flex-1 rounded-lg border bg-surface px-4 py-2">
                        Keep
                      </button>
                    </div>
                  </div>
                </SortableBlock>
              );
            }
            return (
              <SortableBlock key={item.id} id={item.id} disabled={false} className="flex items-center gap-2 rounded-lg border bg-surface p-3">
                <Link href={`/workout/exercise?id=${item.id}`} className="min-w-0 flex-1 break-words">
                  <span className="font-semibold">{item.name}</span>
                  {renderBody?.(item)}
                </Link>
                {arrows}
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => setRemoving(item.id)}
                  className="shrink-0 rounded-lg p-2 text-danger"
                >
                  <TrashIcon />
                </button>
              </SortableBlock>
            );
          })}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
