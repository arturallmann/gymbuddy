'use client';

import { useState } from 'react';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import ExercisePicker from './ExercisePicker';
import SetLog from './SetLog';
import WorkoutExerciseList from './WorkoutExerciseList';

// The exercises of one workout: list, reorder, remove and add.
export default function WorkoutExercises({ workoutId }: { workoutId: string }) {
  const { items, add, move, remove } = useWorkoutExercises(workoutId);
  const [picking, setPicking] = useState(false);

  if (items === undefined) {
    return null;
  }
  return (
    <section className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="text-gray-500">No exercises yet.</p>
      ) : (
        <WorkoutExerciseList
          items={items}
          onMove={move}
          onRemove={remove}
          renderBody={(item) => <SetLog item={item} workoutId={workoutId} />}
        />
      )}
      {picking ? (
        <ExercisePicker
          onPick={async (exercise) => {
            setPicking(false);
            await add(exercise.id);
          }}
          onClose={() => setPicking(false)}
        />
      ) : (
        <button type="button" onClick={() => setPicking(true)} className="rounded-lg border px-6 py-3 font-semibold">
          Add exercise
        </button>
      )}
    </section>
  );
}
