'use client';

import type { ExerciseListItem } from '@/db/exercises';
import type { ExerciseUse } from '@/db/progress';
import { formatUse, splitByUse } from '@/lib/exerciseUse';
import ExerciseList from './ExerciseList';

type Props = {
  items: ExerciseListItem[];
  use: Map<string, ExerciseUse>;
  showImages: boolean;
  href?: (exercise: ExerciseListItem) => string;
};

// A list of exercises with the ones the user did first, under "Done before", the most frequent first
// (decision 037). The others follow under "All exercises". Without any done exercise it is one list.
export default function ExerciseResults({ items, use, showImages, href }: Props) {
  const { doneBefore, rest } = splitByUse(items, use);
  if (doneBefore.length === 0) {
    return <ExerciseList items={rest} showImages={showImages} href={href} />;
  }
  const heading = 'text-sm font-semibold uppercase text-muted';
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Done before" className="flex flex-col gap-1">
        <h2 className={heading}>Done before</h2>
        <ExerciseList
          items={doneBefore}
          showImages={showImages}
          href={href}
          note={(exercise) => formatUse(use.get(exercise.id)!)}
        />
      </section>
      {rest.length > 0 && (
        <section aria-label="All exercises" className="flex flex-col gap-1">
          <h2 className={heading}>All exercises</h2>
          <ExerciseList items={rest} showImages={showImages} href={href} />
        </section>
      )}
    </div>
  );
}
