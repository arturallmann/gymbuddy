import Image from 'next/image';
import Link from 'next/link';
import type { ExerciseListItem } from '@/db/exercises';
import { CATEGORY_LABELS, equipmentLabel, exerciseImageUrl } from '@/lib/exercises';

type Props = {
  items: ExerciseListItem[];
  // Off when the exerciseImages feature toggle is off.
  showImages: boolean;
  // Where each exercise links to. Default: its exercise page.
  href?: (exercise: ExerciseListItem) => string;
  // Extra text after category and equipment, such as "12 workouts".
  note?: (exercise: ExerciseListItem) => string | null;
};

const detailHref = (exercise: ExerciseListItem) => `/exercises/detail?id=${exercise.id}`;

// Exercises with category and equipment, each linked to its exercise page or to `href`.
export default function ExerciseList({ items, showImages, href = detailHref, note }: Props) {
  return (
    <ul className="flex flex-col">
      {items.map((exercise) => (
        <li key={exercise.id}>
          <Link href={href(exercise)} className="flex items-center gap-3 border-b border-line py-2">
            {showImages && (
              <span className="block h-12 w-16 shrink-0 overflow-hidden rounded bg-line">
                {exercise.imagePath && (
                  <Image
                    src={exerciseImageUrl(exercise.imagePath)}
                    alt=""
                    width={64}
                    height={48}
                    className="h-12 w-16 object-cover"
                  />
                )}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block break-words">{exercise.name}</span>
              <span className="block text-sm text-muted">
                {CATEGORY_LABELS[exercise.category]}
                {exercise.equipment && ` · ${equipmentLabel(exercise.equipment)}`}
                {note?.(exercise) && ` · ${note(exercise)}`}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
