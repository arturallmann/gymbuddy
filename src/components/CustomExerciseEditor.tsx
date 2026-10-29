'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import {
  createCustomExercise,
  getExerciseDetail,
  listEquipment,
  listMuscleGroups,
  updateCustomExercise,
  type CustomExerciseInput,
} from '@/db/exercises';
import type { MuscleGroup } from '@/db/schema';
import { useSettings } from '@/hooks/useSettings';
import { EMPTY_CUSTOM_EXERCISE } from '@/lib/exercises';
import CustomExerciseForm from './CustomExerciseForm';

type Loaded = {
  muscleGroups: MuscleGroup[];
  equipment: string[];
  // Null when the id is not a custom exercise of the user.
  initial: CustomExerciseInput | null;
};

// Creates a custom exercise, or edits one: /exercises/edit for a new one, /exercises/edit?id=… to edit.
export default function CustomExerciseEditor() {
  const db = useDatabase();
  const router = useRouter();
  const { userId } = useSettings().settings;
  const id = useSearchParams().get('id');
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);

  useEffect(() => {
    let current = true;
    const load = async (): Promise<Loaded> => {
      const [groups, equipment] = await Promise.all([listMuscleGroups(db), listEquipment(db)]);
      if (!id) {
        return { muscleGroups: groups, equipment, initial: EMPTY_CUSTOM_EXERCISE };
      }
      const detail = await getExerciseDetail(db, userId, id);
      if (!detail || detail.exercise.source !== 'custom') {
        return { muscleGroups: groups, equipment, initial: null };
      }
      const { exercise } = detail;
      const ofRole = (role: string) => detail.muscleGroups.filter((group) => group.role === role).map((group) => group.id);
      return {
        muscleGroups: groups,
        equipment,
        initial: {
          name: exercise.name,
          category: exercise.category,
          equipment: exercise.equipment,
          loadType: exercise.loadType,
          tracksReps: exercise.tracksReps,
          tracksDuration: exercise.tracksDuration,
          tracksDistance: exercise.tracksDistance,
          primaryMuscleGroupIds: ofRole('primary'),
          secondaryMuscleGroupIds: ofRole('secondary'),
        },
      };
    };
    load()
      .then((result) => current && setLoaded(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, id]);

  if (loaded === undefined) {
    return null;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <Link href={id ? `/exercises/detail?id=${id}` : '/exercises'} className="shrink-0 text-sky-600">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">{id ? 'Edit exercise' : 'New custom exercise'}</h1>
      </header>
      {loaded.initial ? (
        <CustomExerciseForm
          initial={loaded.initial}
          muscleGroups={loaded.muscleGroups}
          equipment={loaded.equipment}
          submitLabel={id ? 'Save exercise' : 'Create exercise'}
          onSave={async (input) => {
            let savedId = id;
            if (savedId) {
              await updateCustomExercise(db, userId, savedId, input);
            } else {
              savedId = await createCustomExercise(db, userId, input);
            }
            router.push(`/exercises/detail?id=${savedId}`);
          }}
        />
      ) : (
        <p className="text-gray-500">Only custom exercises can change.</p>
      )}
    </main>
  );
}
