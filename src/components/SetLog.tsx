'use client';

import type { WorkoutExerciseItem } from '@/db/workouts';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { useSets } from '@/hooks/useSets';
import { formatSet, setFormValues } from '@/lib/sets';
import { getUnits } from '@/lib/units';
import SetForm from './SetForm';
import SetList from './SetList';

// The sets of one workout exercise: what was logged, last time's sets and the set form.
export default function SetLog({ item, workoutId }: { item: WorkoutExerciseItem; workoutId: string }) {
  const { settings } = useSettings();
  const features = useFeatures();
  const units = getUnits(settings);
  const { sets, lastSets, add, remove } = useSets(item.id, item.exerciseId, workoutId);

  if (sets === undefined || lastSets === undefined) {
    return null;
  }
  // Prefill: the same set number last time, otherwise the previous set in this workout.
  const source = lastSets[sets.length] ?? sets.at(-1) ?? null;
  return (
    <div className="flex flex-col gap-3">
      {lastSets.length > 0 && (
        <p className="text-sm text-gray-500">
          Last time:{' '}
          {lastSets
            .map((set) => formatSet(set, item.loadType, units) + (set.notes ? ` (${set.notes})` : ''))
            .join(', ')}
        </p>
      )}
      <SetList sets={sets} loadType={item.loadType} units={units} onRemove={remove} />
      <SetForm
        key={sets.length}
        exercise={item}
        units={units}
        features={features}
        initial={setFormValues(source, units)}
        onLog={add}
      />
    </div>
  );
}
