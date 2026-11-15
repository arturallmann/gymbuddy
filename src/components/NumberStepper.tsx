'use client';

import { useId } from 'react';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  // Called by − (-1) and + (1).
  onStep: (direction: -1 | 1) => void;
  inputMode: 'decimal' | 'numeric';
  // Names of the − and + buttons for screen readers, such as "Less weight".
  lessLabel: string;
  moreLabel: string;
  hint?: string;
};

// A number input with − and + on its sides (decision 042): type a value, or nudge it without the keyboard.
export default function NumberStepper({ label, value, onChange, onStep, inputMode, lessLabel, moreLabel, hint }: Props) {
  const id = useId();
  const button = 'h-12 w-12 shrink-0 rounded-full border bg-surface text-2xl leading-none';
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id}>{label}</label>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={lessLabel} onClick={() => onStep(-1)} className={button}>
          −
        </button>
        <input
          id={id}
          inputMode={inputMode}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 min-w-0 flex-1 rounded-lg border px-3 text-center text-xl font-semibold tabular-nums"
        />
        <button type="button" aria-label={moreLabel} onClick={() => onStep(1)} className={button}>
          +
        </button>
      </div>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
