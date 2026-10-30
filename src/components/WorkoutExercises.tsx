'use client';

import { useState } from 'react';
import type { WorkoutExerciseItem } from '@/db/workouts';
import { useFeatures } from '@/hooks/useSettings';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import { PHASE_LABELS, defaultPhase, groupByPhase } from '@/lib/phases';
import ExercisePicker from './ExercisePicker';
import GroupRounds from './GroupRounds';
import SetSummary from './SetSummary';
import WorkoutExerciseList from './WorkoutExerciseList';

// The exercises of one workout: list with set summaries, reorder, remove and add.
// With the phases feature toggle, the list shows one section per workout phase.
// With the supersets feature toggle, workout exercises can become a superset and back.
export default function WorkoutExercises({ workoutId }: { workoutId: string }) {
  const { items, rests, add, move, remove, group, ungroup } = useWorkoutExercises(workoutId);
  const features = useFeatures();
  const [picking, setPicking] = useState(false);
  // The workout exercises chosen for a new superset, or null when not choosing.
  const [chosen, setChosen] = useState<string[] | null>(null);

  if (items === undefined) {
    return null;
  }
  const chosenPhase = chosen?.length ? items.find((item) => item.id === chosen[0])?.phase : undefined;
  const canGroup = features.supersets && items.filter((item) => !item.groupId).length >= 2;

  const renderList = (list: WorkoutExerciseItem[]) => (
    <WorkoutExerciseList
      items={list}
      onMove={move}
      onRemove={remove}
      onUngroup={features.supersets ? ungroup : undefined}
      selection={
        chosen
          ? {
              chosen,
              onToggle: (id) => setChosen(chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id]),
              // One superset holds workout exercises of one phase.
              canChoose: (item) => !chosenPhase || item.phase === chosenPhase,
            }
          : undefined
      }
      renderGroup={(members) => (
        <GroupRounds members={members} workoutId={workoutId} restSeconds={rests.get(members[0].groupId!) ?? null} />
      )}
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
        groupByPhase(items).map((phaseGroup) => (
          <section key={phaseGroup.phase} aria-label={PHASE_LABELS[phaseGroup.phase]} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase text-gray-400">{PHASE_LABELS[phaseGroup.phase]}</h2>
            {renderList(phaseGroup.items)}
          </section>
        ))
      ) : (
        renderList(items)
      )}
      {chosen ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-400">Choose two or more exercises of one phase.</p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={chosen.length < 2}
              onClick={async () => {
                await group(chosen);
                setChosen(null);
              }}
              className="flex-1 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              Make superset ({chosen.length})
            </button>
            <button type="button" onClick={() => setChosen(null)} className="rounded-lg border px-4 py-2">
              Cancel
            </button>
          </div>
        </div>
      ) : picking ? (
        <ExercisePicker
          onPick={async (exercise) => {
            setPicking(false);
            await add(exercise.id, defaultPhase(exercise.category, features.phases));
          }}
          onClose={() => setPicking(false)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setPicking(true)} className="rounded-lg border px-6 py-3 font-semibold">
            Add exercise
          </button>
          {canGroup && (
            <button type="button" onClick={() => setChosen([])} className="rounded-lg border px-6 py-3 font-semibold">
              Make superset
            </button>
          )}
        </div>
      )}
    </section>
  );
}
