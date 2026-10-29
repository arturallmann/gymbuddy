'use client';

import { useState } from 'react';
import type { WorkoutExerciseItem } from '@/db/workouts';
import { useFeatures } from '@/hooks/useSettings';
import { useSets } from '@/hooks/useSets';
import { formatSet, setFormValues } from '@/lib/sets';
import type { Units } from '@/lib/units';
import SetForm from './SetForm';
import SetList from './SetList';

type Props = {
  item: WorkoutExerciseItem;
  workoutId: string;
  // The units for this exercise: its unit override, otherwise the settings (getUnits).
  units: Units;
};

// The sets of one workout exercise: last time's sets, the set form, then what was logged.
// Tapping a logged set opens it for editing in the same form.
export default function SetLog({ item, workoutId, units }: Props) {
  const features = useFeatures();
  const { sets, lastSets, add, update, remove } = useSets(item.id, item.exerciseId, workoutId);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (sets === undefined || lastSets === undefined) {
    return null;
  }
  const editing = sets.find((set) => set.id === editingId) ?? null;
  // Prefill: the same set number last time, otherwise the previous set in this workout.
  const source = lastSets[sets.length] ?? sets.at(-1) ?? null;
  return (
    <div className="flex flex-col gap-4">
      {lastSets.length > 0 && (
        <p className="text-sm text-gray-500">
          Last time:{' '}
          {lastSets
            .map((set) => formatSet(set, item.loadType, units) + (set.notes ? ` (${set.notes})` : ''))
            .join(', ')}
        </p>
      )}
      {editing ? (
        <SetForm
          key={`edit-${editing.id}-${units.weightUnit}-${units.distanceUnit}`}
          exercise={item}
          units={units}
          features={features}
          initial={setFormValues(editing, units, 'edit')}
          base={editing}
          submitLabel="Save set"
          onCancel={() => setEditingId(null)}
          onLog={async (values) => {
            await update(editing.id, values);
            setEditingId(null);
          }}
        />
      ) : (
        <SetForm
          key={`new-${sets.length}-${units.weightUnit}-${units.distanceUnit}`}
          exercise={item}
          units={units}
          features={features}
          initial={setFormValues(source, units)}
          onLog={add}
        />
      )}
      <SetList
        sets={sets}
        loadType={item.loadType}
        units={units}
        editingId={editingId}
        onEdit={(id) => setEditingId(id === editingId ? null : id)}
        onRemove={async (id) => {
          if (id === editingId) setEditingId(null);
          await remove(id);
        }}
      />
    </div>
  );
}
