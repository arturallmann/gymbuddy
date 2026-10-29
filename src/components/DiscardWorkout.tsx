'use client';

import { useState } from 'react';

// "Discard workout" with a confirm step, because it deletes the workout.
export default function DiscardWorkout({ onDiscard }: { onDiscard: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-red-600">
        Discard workout
      </button>
    );
  }
  return (
    <div role="group" aria-label="Discard workout" className="flex flex-col gap-3 rounded-lg border border-red-300 p-4">
      <p>Discard this workout? Its exercises and sets are deleted.</p>
      <div className="flex gap-3">
        <button type="button" onClick={onDiscard} className="rounded-lg bg-red-600 px-4 py-2 text-white">
          Discard
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border px-4 py-2">
          Keep workout
        </button>
      </div>
    </div>
  );
}
