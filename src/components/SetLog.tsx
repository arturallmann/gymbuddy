'use client';

import { useState } from 'react';
import type { WorkoutExerciseItem } from '@/db/workouts';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { useSets } from '@/hooks/useSets';
import { formatSet, setFormValues } from '@/lib/sets';
import { getUnits } from '@/lib/units';
import SetForm from './SetForm';
import SetList from './SetList';

// The sets of one workout exercise: last time's sets, what was logged and the set form.
// Tapping a logged set opens it for editing in the same form.
export default function SetLog({ item, workoutId }: { item: WorkoutExerciseItem; workoutId: string }) {
  const { settings } = useSettings();
  const features = useFeatures();
  const units = getUnits(settings);
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
      {editing ? (
        <SetForm
          key={`edit-${editing.id}`}
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
          key={`new-${sets.length}`}
          exercise={item}
          units={units}
          features={features}
          initial={setFormValues(source, units)}
          onLog={add}
        />
      )}
    </div>
  );
}
