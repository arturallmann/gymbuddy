'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { deleteCustomExercise, getExerciseDetail, type ExerciseDetail } from '@/db/exercises';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { CATEGORY_LABELS, equipmentLabel, exerciseImageUrl, instructionSteps } from '@/lib/exercises';
import ConfirmAction from './ConfirmAction';

// One exercise: images, category, equipment, muscle groups, description and instructions.
// The exercise id comes from the address: /exercises/detail?id=…
export default function ExerciseDetailView() {
  const db = useDatabase();
  const router = useRouter();
  const { userId } = useSettings().settings;
  const features = useFeatures();
  const id = useSearchParams().get('id');
  const [detail, setDetail] = useState<ExerciseDetail | null | undefined>(undefined);

  useEffect(() => {
    let current = true;
    (id ? getExerciseDetail(db, userId, id) : Promise.resolve(null))
      .then((loaded) => current && setDetail(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, id]);

  if (detail === undefined) {
    return null;
  }
  const exercise = detail?.exercise;
  const primary = detail?.muscleGroups.filter((group) => group.role === 'primary') ?? [];
  const secondary = detail?.muscleGroups.filter((group) => group.role === 'secondary') ?? [];
  const steps = instructionSteps(exercise?.instructions ?? null);
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <Link href="/exercises" className="shrink-0 text-sky-600">
          ← Exercises
        </Link>
      </header>
      {!detail || !exercise ? (
        <p className="text-gray-500">This exercise does not exist.</p>
      ) : (
        <>
          <div>
            <h1 className="break-words text-2xl font-bold">{exercise.name}</h1>
            <p className="text-gray-500">
              {exercise.source === 'custom' && 'Custom exercise · '}
              {CATEGORY_LABELS[exercise.category]}
              {exercise.equipment && ` · ${equipmentLabel(exercise.equipment)}`}
            </p>
          </div>
          {features.exerciseImages && detail.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {detail.images.map((path, index) => (
                <Image
                  key={path}
                  src={exerciseImageUrl(path)}
                  alt={`${exercise.name}, image ${index + 1}`}
                  width={400}
                  height={300}
                  className="h-auto w-full rounded"
                />
              ))}
            </div>
          )}
          {primary.length > 0 && (
            <p>
              <span className="text-gray-500">Primary muscle groups: </span>
              {primary.map((group) => group.name).join(', ')}
            </p>
          )}
          {secondary.length > 0 && (
            <p>
              <span className="text-gray-500">Secondary muscle groups: </span>
              {secondary.map((group) => group.name).join(', ')}
            </p>
          )}
          {exercise.description && <p className="break-words">{exercise.description}</p>}
          {exercise.source === 'custom' && (
            <div className="flex flex-col items-start gap-4">
              <Link href={`/exercises/edit?id=${exercise.id}`} className="rounded-lg border px-4 py-2 font-semibold">
                Edit
              </Link>
              <ConfirmAction
                label="Delete exercise"
                question="Delete this exercise? Workouts that used it keep their sets."
                confirmLabel="Delete"
                keepLabel="Keep exercise"
                onConfirm={async () => {
                  await deleteCustomExercise(db, userId, exercise.id);
                  router.push('/exercises');
                }}
              />
            </div>
          )}
          {steps.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">Instructions</h2>
              <ol className="flex list-decimal flex-col gap-2 pl-5">
                {steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </main>
  );
}
