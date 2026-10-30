'use client';

import { useState } from 'react';
import type { CustomExerciseInput } from '@/db/exercises';
import { CATEGORIES, LOAD_TYPES, type Category, type LoadType, type MuscleGroup } from '@/db/schema';
import { CATEGORY_LABELS, LOAD_TYPE_LABELS, equipmentLabel } from '@/lib/exercises';

type Props = {
  initial: CustomExerciseInput;
  muscleGroups: MuscleGroup[];
  // Equipment names in use, offered as suggestions.
  equipment: string[];
  submitLabel: string;
  onSave: (input: CustomExerciseInput) => Promise<void>;
};

const TRACKED_FIELDS = [
  { key: 'tracksReps', label: 'Reps' },
  { key: 'tracksDuration', label: 'Duration' },
  { key: 'tracksDistance', label: 'Distance' },
] as const;

const inputClass = 'w-full min-w-0 rounded-lg border px-3 py-2 text-black';

// Name, category, equipment, load type, tracked fields and muscle groups of a custom exercise.
export default function CustomExerciseForm({ initial, muscleGroups, equipment, submitLabel, onSave }: Props) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const change = (patch: Partial<CustomExerciseInput>) => setForm((current) => ({ ...current, ...patch }));
  const toggle = (list: 'primaryMuscleGroupIds' | 'secondaryMuscleGroupIds', id: string, on: boolean) =>
    change({ [list]: on ? [...form[list], id] : form[list].filter((item) => item !== id) });

  return (
    <form
      aria-label="Custom exercise"
      className="flex flex-col gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!form.name.trim()) {
          setError('Fill in a name.');
          return;
        }
        setError(null);
        setSaving(true);
        try {
          await onSave(form);
        } finally {
          setSaving(false);
        }
      }}
    >
      <label className="flex flex-col gap-1">
        <span>Name</span>
        <input value={form.name} onChange={(event) => change({ name: event.target.value })} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span>Category</span>
        <select
          value={form.category}
          onChange={(event) => change({ category: event.target.value as Category })}
          className={inputClass}
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span>Equipment</span>
        <input
          list="equipment-suggestions"
          value={form.equipment ?? ''}
          onChange={(event) => change({ equipment: event.target.value })}
          className={inputClass}
        />
        <datalist id="equipment-suggestions">
          {equipment.map((name) => (
            <option key={name} value={name}>
              {equipmentLabel(name)}
            </option>
          ))}
        </datalist>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1">Load type</legend>
        {LOAD_TYPES.map((loadType) => (
          <label key={loadType} className="flex items-center gap-2">
            <input
              type="radio"
              name="loadType"
              checked={form.loadType === loadType}
              onChange={() => change({ loadType: loadType as LoadType })}
            />
            {LOAD_TYPE_LABELS[loadType]}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1">Tracked fields</legend>
        {TRACKED_FIELDS.map((field) => (
          <label key={field.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form[field.key]}
              onChange={(event) => change({ [field.key]: event.target.checked })}
            />
            {field.label}
          </label>
        ))}
        <span className="text-xs text-gray-500">Without tracked fields, sets hold notes only.</span>
      </fieldset>
      {(['primaryMuscleGroupIds', 'secondaryMuscleGroupIds'] as const).map((list) => (
        <fieldset key={list} className="flex flex-col gap-2">
          <legend className="mb-1">
            {list === 'primaryMuscleGroupIds' ? 'Primary muscle groups' : 'Secondary muscle groups'}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {muscleGroups.map((group) => (
              <label key={group.id} className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  checked={form[list].includes(group.id)}
                  onChange={(event) => toggle(list, group.id, event.target.checked)}
                />
                <span className="break-words">{group.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  );
}
