'use client';

import { useState } from 'react';
import type { WorkoutExerciseItem } from '@/db/workouts';
import { useFeatures } from '@/hooks/useSettings';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import { PHASE_LABELS, defaultPhase, groupByPhase } from '@/lib/phases';
import ExercisePicker from './ExercisePicker';
import SetSummary from './SetSummary';
import WorkoutExerciseList from './WorkoutExerciseList';

// The exercises of one workout: list with set summaries, reorder, remove and add.
// With the phases feature toggle, the list shows one section per workout phase.
export default function WorkoutExercises({ workoutId }: { workoutId: string }) {
  const { items, add, move, remove } = useWorkoutExercises(workoutId);
  const features = useFeatures();
  const [picking, setPicking] = useState(false);

  if (items === undefined) {
    return null;
  }
  const renderList = (list: WorkoutExerciseItem[]) => (
    <WorkoutExerciseList
      items={list}
      onMove={move}
      onRemove={remove}
      renderBody={(item) => (
        <>
          <SetSummary workoutExerciseId={item.id} exerciseId={item.exerciseId} loadType={item.loadType} />
          {/* A toggle hides controls only: a stored phase still shows. */}
          {!features.phases && item.phase !== 'main' && (
            <span className="block text-xs text-gray-500">{PHASE_LABELS[item.phase]}</span>
          )}
        </>
      )}
    />
  );
  return (
    <section className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="text-gray-500">No exercises yet.</p>
      ) : features.phases ? (
        groupByPhase(items).map((group) => (
          <section key={group.phase} aria-label={PHASE_LABELS[group.phase]} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase text-gray-400">{PHASE_LABELS[group.phase]}</h2>
            {renderList(group.items)}
          </section>
        ))
      ) : (
        renderList(items)
      )}
      {picking ? (
        <ExercisePicker
          onPick={async (exercise) => {
            setPicking(false);
            await add(exercise.id, defaultPhase(exercise.category, features.phases));
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
