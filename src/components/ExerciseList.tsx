import Image from 'next/image';
import Link from 'next/link';
import type { ExerciseListItem } from '@/db/exercises';
import { CATEGORY_LABELS, equipmentLabel, exerciseImageUrl } from '@/lib/exercises';

type Props = {
  items: ExerciseListItem[];
  // Off when the exerciseImages feature toggle is off.
  showImages: boolean;
};

// Exercises with category and equipment, each linked to its exercise page.
export default function ExerciseList({ items, showImages }: Props) {
  return (
    <ul className="flex flex-col">
      {items.map((exercise) => (
        <li key={exercise.id}>
          <Link href={`/exercises/detail?id=${exercise.id}`} className="flex items-center gap-3 border-b py-2">
            {showImages && (
              <span className="block h-12 w-16 shrink-0 overflow-hidden rounded bg-gray-800">
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
              <span className="block text-sm text-gray-500">
                {CATEGORY_LABELS[exercise.category]}
                {exercise.equipment && ` · ${equipmentLabel(exercise.equipment)}`}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
