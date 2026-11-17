'use client';

import { useState } from 'react';
import type { WorkoutExerciseItem } from '@/db/workouts';
import { useFeatures } from '@/hooks/useSettings';
import { useSets } from '@/hooks/useSets';
import { formatSet, setFormValues, type SetValues } from '@/lib/sets';
import { targetsAsSet } from '@/lib/templates';
import type { Units } from '@/lib/units';
import SetForm from './SetForm';
import SetList from './SetList';
import StretchTimer from './StretchTimer';
import { useBackHandler } from '@/hooks/useBackHandler';

const DEFAULT_STRETCH_SECONDS = 30;

const EMPTY_SET: SetValues = {
  setType: 'normal',
  weightGrams: null,
  reps: null,
  durationSeconds: null,
  distanceMeters: null,
  rpe: null,
  notes: null,
};

// A workout exercise, or an exercise not in the workout yet (id null, decision 031).
export type SetLogItem = Omit<WorkoutExerciseItem, 'id'> & { id: string | null };

type Props = {
  item: SetLogItem;
  workoutId: string;
  // The units for this exercise: its unit override, otherwise the settings (getUnits).
  units: Units;
  // Only for an exercise not in the workout yet: adds it with its first set.
  onFirstSet?: (values: SetValues) => Promise<void>;
};

// The sets of one workout exercise: last time's sets, the stretch timer (for stretches),
// the set form, then what was logged.
// Tapping a logged set opens it for editing in the same form.
export default function SetLog({ item, workoutId, units, onFirstSet }: Props) {
  const features = useFeatures();
  const { sets, lastSets, targets, add, update, remove } = useSets(item.id, item.exerciseId, workoutId, onFirstSet);
  const [editingId, setEditingId] = useState<string | null>(null);
  useBackHandler(editingId ? () => setEditingId(null) : null);

  if (sets === undefined || lastSets === undefined) {
    return null;
  }
  const editing = sets.find((set) => set.id === editingId) ?? null;
  // Prefill: the same set number last time, otherwise the previous set in this workout,
  // otherwise the template targets (DATA_MODEL prefill order).
  const source = lastSets[sets.length] ?? sets.at(-1) ?? targetsAsSet(targets);
  // The stretch timer belongs to the phases feature toggle (docs/DATA_MODEL.md).
  const showTimer =
    features.phases && item.tracksDuration && (item.category === 'stretch' || item.defaultDurationSeconds !== null);
  return (
    <div className="flex flex-col gap-4">
      {lastSets.length > 0 && (
        <p className="text-sm text-muted">
          Last time:{' '}
          {lastSets
            .map((set) => formatSet(set, item.loadType, units) + (set.notes ? ` (${set.notes})` : ''))
            .join(', ')}
        </p>
      )}
      {showTimer && (
        <StretchTimer
          initialSeconds={item.defaultDurationSeconds ?? source?.durationSeconds ?? DEFAULT_STRETCH_SECONDS}
          onLog={(seconds) => add({ ...EMPTY_SET, durationSeconds: seconds })}
        />
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
