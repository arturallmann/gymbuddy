'use client';

import { useState, type ReactNode } from 'react';
import { SET_TYPES, type FeatureToggles, type SetType } from '@/db/schema';
import {
  SET_TYPE_LABELS,
  extraFieldsLabel,
  parseSetForm,
  setFormFields,
  type SetFormExercise,
  type SetFormValues,
  type SetValues,
} from '@/lib/sets';
import { DISTANCE_INPUT_UNITS, type DistanceInputUnit, type Units } from '@/lib/units';

type Props = {
  exercise: SetFormExercise;
  units: Units;
  features: FeatureToggles;
  initial: SetFormValues;
  onLog: (values: SetValues) => Promise<void>;
  // The set being edited. Hidden inputs keep its values.
  base?: SetValues;
  submitLabel?: string;
  onCancel?: () => void;
};

const inputClass = 'w-full min-w-0 rounded-lg border px-3 py-2 text-black';

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

// Inputs for one set. Which inputs show depends on the exercise's load type,
// its tracked fields and the feature toggles. RPE, set type and notes sit in a
// section that opens on tap, so the main inputs stay in view.
export default function SetForm({
  exercise,
  units,
  features,
  initial,
  onLog,
  base,
  submitLabel = 'Log set',
  onCancel,
}: Props) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fields = setFormFields(exercise, features);
  const extras = extraFieldsLabel(fields);
  // Open when the set already has one of these values, so nothing stored is out of sight.
  const [showExtras, setShowExtras] = useState(
    initial.rpe !== '' || initial.notes !== '' || initial.setType !== 'normal',
  );
  const change = (patch: Partial<SetFormValues>) => setForm((current) => ({ ...current, ...patch }));

  return (
    <form
      aria-label={submitLabel}
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const parsed = parseSetForm(form, exercise, features, units, base);
        if (!parsed.ok) {
          setError(parsed.error);
          return;
        }
        setError(null);
        setSaving(true);
        try {
          await onLog(parsed.values);
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        {fields.weight && (
          <Field
            label={`${exercise.loadType === 'bodyweight' ? 'Added weight' : 'Weight'} (${units.weightUnit})`}
            hint={exercise.loadType === 'bodyweight' ? 'Empty = bodyweight only. Negative = assisted.' : undefined}
          >
            <input
              inputMode="decimal"
              value={form.weight}
              onChange={(event) => change({ weight: event.target.value })}
              className={inputClass}
            />
          </Field>
        )}
        {fields.reps && (
          <Field label="Reps">
            <input
              inputMode="numeric"
              value={form.reps}
              onChange={(event) => change({ reps: event.target.value })}
              className={inputClass}
            />
          </Field>
        )}
        {fields.duration && (
          <Field label="Duration">
            <input
              inputMode="numeric"
              placeholder="1:30"
              value={form.duration}
              onChange={(event) => change({ duration: event.target.value })}
              className={inputClass}
            />
          </Field>
        )}
        {fields.distance && (
          <Field label="Distance">
            <div className="flex min-w-0 gap-2">
              <input
                inputMode="decimal"
                value={form.distance}
                onChange={(event) => change({ distance: event.target.value })}
                className={inputClass}
              />
              <select
                aria-label="Distance unit"
                value={form.distanceUnit}
                onChange={(event) => change({ distanceUnit: event.target.value as DistanceInputUnit })}
                className="shrink-0 rounded-lg border px-2 text-black"
              >
                {DISTANCE_INPUT_UNITS[units.distanceUnit].map((unit) => (
                  <option key={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </Field>
        )}
      </div>
      {extras && (
        <details
          open={showExtras}
          onToggle={(event) => setShowExtras(event.currentTarget.open)}
          className="rounded-lg border px-3 py-2"
        >
          <summary className="cursor-pointer text-sm text-gray-400">{extras}</summary>
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              {fields.rpe && (
                <Field label="RPE">
                  <input
                    inputMode="decimal"
                    value={form.rpe}
                    onChange={(event) => change({ rpe: event.target.value })}
                    className={inputClass}
                  />
                </Field>
              )}
              {fields.setType && (
                <Field label="Set type">
                  <select
                    value={form.setType}
                    onChange={(event) => change({ setType: event.target.value as SetType })}
                    className={inputClass}
                  >
                    {SET_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {SET_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            {fields.notes && (
              <Field label="Notes">
                <input value={form.notes} onChange={(event) => change({ notes: event.target.value })} className={inputClass} />
              </Field>
            )}
          </div>
        </details>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
