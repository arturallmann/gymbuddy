'use client';

import { useId, useState } from 'react';
import type { Bodyweight } from '@/db/schema';
import { useSettings } from '@/hooks/useSettings';
import { formatWorkoutDate } from '@/lib/dates';
import { formatWeight, parseDecimal, weightToGrams } from '@/lib/units';

type Props = {
  // The newest bodyweight, or null before the first one.
  current: Bodyweight | null;
  onSave: (weightGrams: number) => Promise<void>;
};

const inputClass = 'w-full min-w-0 rounded-lg border px-3 py-2';

// Enter a new bodyweight (decision 043). Saving adds a bodyweight from today on; workouts of earlier
// days keep the bodyweight they had.
export default function BodyweightForm({ current, onSave }: Props) {
  const { weightUnit } = useSettings().settings;
  const id = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <form
      aria-label="Bodyweight"
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const value = parseDecimal(text);
        if (value === null || value <= 0) {
          setError(`Enter your bodyweight in ${weightUnit}, such as ${weightUnit === 'kg' ? '80' : '175'}.`);
          return;
        }
        setSaving(true);
        try {
          await onSave(weightToGrams(value, weightUnit));
          setText('');
          setError(null);
          setSaved(true);
        } finally {
          setSaving(false);
        }
      }}
    >
      <p className="text-sm">
        {current ? (
          <>
            <span className="text-muted">Bodyweight: </span>
            <span className="font-semibold">{formatWeight(current.weightGrams, weightUnit)}</span>
            <span className="text-muted"> · {formatWorkoutDate(current.measuredAt)}</span>
          </>
        ) : (
          <span className="text-muted">No bodyweight yet. Bodyweight exercises then have no volume.</span>
        )}
      </p>
      <label htmlFor={id} className="text-sm">
        New bodyweight ({weightUnit})
      </label>
      <div className="flex gap-3">
        <input
          id={id}
          inputMode="decimal"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setSaved(false);
          }}
          className={inputClass}
        />
        <button type="submit" disabled={saving} className="shrink-0 rounded-lg border bg-surface px-4 py-2 font-semibold disabled:opacity-50">
          Save
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-muted">
          Saved. Workouts from today on use it.
        </p>
      )}
    </form>
  );
}
