'use client';

import type { Preset } from '@/db/schema';
import { PRESET_DESCRIPTIONS, PRESET_LABELS } from '@/lib/features';

type FixedPreset = Exclude<Preset, 'custom'>;
const PRESETS: FixedPreset[] = ['simple', 'standard', 'advanced'];

// The presets as large buttons with a description each.
export default function PresetPicker({
  value,
  onChange,
}: {
  value: FixedPreset;
  onChange: (preset: FixedPreset) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Preset" className="flex flex-col gap-3">
      {PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          role="radio"
          aria-checked={preset === value}
          onClick={() => onChange(preset)}
          className={`flex flex-col items-start rounded-lg border bg-surface p-4 text-left ${
            preset === value ? 'border-primary ring-2 ring-primary' : 'border-line-strong'
          }`}
        >
          <span className="font-medium">{PRESET_LABELS[preset]}</span>
          <span className="text-sm text-muted">{PRESET_DESCRIPTIONS[preset]}</span>
        </button>
      ))}
    </div>
  );
}
