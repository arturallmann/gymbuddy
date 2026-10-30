'use client';

import { useState } from 'react';

type Props = {
  label: string;
  question: string;
  confirmLabel: string;
  keepLabel: string;
  onConfirm: () => Promise<void>;
};

// A button for an action that deletes something, with a confirm step.
export default function ConfirmAction({ label, question, confirmLabel, keepLabel, onConfirm }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-red-600">
        {label}
      </button>
    );
  }
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-3 rounded-lg border border-red-300 p-4">
      <p>{question}</p>
      <div className="flex gap-3">
        <button type="button" onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-white">
          {confirmLabel}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border px-4 py-2">
          {keepLabel}
        </button>
      </div>
    </div>
  );
}
