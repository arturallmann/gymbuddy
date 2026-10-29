'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { searchExercises } from '@/db/exercises';
import type { Exercise } from '@/db/schema';
import { useSettings } from '@/hooks/useSettings';

type Props = {
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
};

// Search field and a list of matching exercises. Tapping one picks it.
export default function ExercisePicker({ onPick, onClose }: Props) {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Exercise[] | undefined>(undefined);

  useEffect(() => {
    let current = true;
    searchExercises(db, userId, query)
      .then((result) => current && setFound(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, query]);

  return (
    <section aria-label="Add exercise" className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <input
          type="search"
          aria-label="Search exercises"
          placeholder="Search exercises"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-black"
        />
        <button type="button" onClick={onClose} className="shrink-0 text-sky-600">
          Cancel
        </button>
      </div>
      {found && found.length === 0 && <p className="text-gray-500">No exercise found.</p>}
      <ul className="flex max-h-96 flex-col overflow-y-auto">
        {found?.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              onClick={() => onPick(exercise)}
              className="w-full break-words border-b py-3 text-left"
            >
              {exercise.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
