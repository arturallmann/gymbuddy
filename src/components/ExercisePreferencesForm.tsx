'use client';

import { useState } from 'react';
import type { ExercisePreferencesChange } from '@/db/preferences';
import type { DistanceUnit, ExercisePreferences, WeightUnit } from '@/db/schema';
import type { Units } from '@/lib/units';

type Props = {
  preferences: ExercisePreferences | null;
  // The units from the settings, shown as the choice without an override.
  settingsUnits: Units;
  onSave: (change: ExercisePreferencesChange) => Promise<void>;
};

const DISTANCE_LABELS: Record<DistanceUnit, string> = {
  metric: 'Metric (m, km)',
  imperial: 'Imperial (ft, mi)',
};

const inputClass = 'w-full min-w-0 rounded-lg border px-3 py-2 text-black';

// The user's own notes and unit override for one exercise.
export default function ExercisePreferencesForm({ preferences, settingsUnits, onSave }: Props) {
  const [notes, setNotes] = useState(preferences?.notes ?? '');
  const [weightUnit, setWeightUnit] = useState<WeightUnit | ''>(preferences?.weightUnit ?? '');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit | ''>(preferences?.distanceUnit ?? '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <form
      aria-label="Exercise preferences"
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
          await onSave({ notes, weightUnit: weightUnit || null, distanceUnit: distanceUnit || null });
          setSaved(true);
        } finally {
          setSaving(false);
        }
      }}
      onChange={() => setSaved(false)}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span>Notes</span>
        <textarea
          rows={2}
          placeholder="For example: Seat at 4."
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={inputClass}
        />
      </label>
      <div className="flex flex-col gap-3">
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span>Weight unit</span>
          <select
            value={weightUnit}
            onChange={(event) => setWeightUnit(event.target.value as WeightUnit | '')}
            className={inputClass}
          >
            <option value="">Same as settings: {settingsUnits.weightUnit}</option>
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span>Distance unit</span>
          <select
            value={distanceUnit}
            onChange={(event) => setDistanceUnit(event.target.value as DistanceUnit | '')}
            className={inputClass}
          >
            <option value="">Same as settings: {DISTANCE_LABELS[settingsUnits.distanceUnit]}</option>
            <option value="metric">{DISTANCE_LABELS.metric}</option>
            <option value="imperial">{DISTANCE_LABELS.imperial}</option>
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="rounded-lg border px-4 py-2 font-semibold disabled:opacity-50">
          Save
        </button>
        {saved && (
          <span role="status" className="text-sm text-gray-500">
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
