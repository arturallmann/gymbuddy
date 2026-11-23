'use client';

import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { centimetersToMillimeters, feetInchesToMillimeters, millimetersToFeetInches, parseDecimal } from '@/lib/units';

const inputClass = 'w-full min-w-0 rounded-lg border px-3 py-2';

// The user's height in the settings (decision 043): cm for metric, feet and inches for imperial.
export default function HeightForm() {
  const { settings, updateSettings } = useSettings();
  const stored = settings.heightMillimeters;
  const metric = settings.distanceUnit === 'metric';
  const feetInches = stored === null ? null : millimetersToFeetInches(stored);
  const [centimeters, setCentimeters] = useState(stored === null ? '' : String(Math.round(stored / 10)));
  const [feet, setFeet] = useState(feetInches ? String(feetInches.feet) : '');
  const [inches, setInches] = useState(feetInches ? String(feetInches.inches) : '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const read = (): number | null | 'invalid' => {
    if (metric) {
      if (centimeters.trim() === '') return null;
      const value = parseDecimal(centimeters);
      return value !== null && value > 0 ? centimetersToMillimeters(value) : 'invalid';
    }
    if (feet.trim() === '' && inches.trim() === '') return null;
    const f = feet.trim() === '' ? 0 : parseDecimal(feet);
    const i = inches.trim() === '' ? 0 : parseDecimal(inches);
    return f !== null && i !== null && f >= 0 && i >= 0 && f + i > 0 ? feetInchesToMillimeters(f, i) : 'invalid';
  };

  return (
    <form
      aria-label="Height"
      className="flex flex-col gap-2"
      onChange={() => setSaved(false)}
      onSubmit={async (event) => {
        event.preventDefault();
        const value = read();
        if (value === 'invalid') {
          setError(metric ? 'Enter your height in cm, such as 180.' : 'Enter your height in feet and inches, such as 5 and 11.');
          return;
        }
        setError(null);
        await updateSettings({ heightMillimeters: value });
        setSaved(true);
      }}
    >
      <div className="flex items-end gap-3">
        {metric ? (
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            Height (cm)
            <input inputMode="decimal" value={centimeters} onChange={(e) => setCentimeters(e.target.value)} className={inputClass} />
          </label>
        ) : (
          <>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
              Height (ft)
              <input inputMode="numeric" value={feet} onChange={(e) => setFeet(e.target.value)} className={inputClass} />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
              Height (in)
              <input inputMode="numeric" value={inches} onChange={(e) => setInches(e.target.value)} className={inputClass} />
            </label>
          </>
        )}
        <button type="submit" className="shrink-0 rounded-lg border bg-surface px-4 py-2 font-medium">
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
          Saved
        </p>
      )}
    </form>
  );
}
