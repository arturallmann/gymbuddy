'use client';

import { useBodyweights } from '@/hooks/useBodyweights';
import { useSettings } from '@/hooks/useSettings';
import { formatWorkoutDate } from '@/lib/dates';
import { chartCoordinates } from '@/lib/progress';
import { formatWeight } from '@/lib/units';
import BodyweightForm from '@/components/settings/BodyweightForm';
import TrashIcon from '@/components/ui/icons/TrashIcon';

const BOX = { width: 320, height: 140, padding: 16 };

// The bodyweight tab of the statistics page (decision 043): enter a new bodyweight, see it over time,
// and delete one entered by mistake.
export default function BodyweightSection() {
  const { weightUnit } = useSettings().settings;
  const { bodyweights, add, remove } = useBodyweights();
  if (!bodyweights) return null;
  const points = bodyweights.map((entry) => ({ workoutId: entry.id, startedAt: entry.measuredAt, value: entry.weightGrams }));
  // The chart starts near the lowest value, so small changes show.
  const bottom = points.length ? Math.min(...points.map((p) => p.value)) : 0;
  const shifted = points.map((p) => ({ ...p, value: p.value - bottom + 1000 }));
  const coordinates = chartCoordinates(shifted, BOX);
  return (
    <div className="flex flex-col gap-4">
      <BodyweightForm current={bodyweights.at(-1) ?? null} onSave={add} />
      {points.length >= 2 && (
        <svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} role="img" aria-label="Bodyweight over time" className="w-full rounded-lg border">
          <polyline points={coordinates.map(({ x, y }) => `${x},${y}`).join(' ')} fill="none" className="stroke-link" strokeWidth={2} />
          {coordinates.map(({ x, y }, index) => (
            <circle key={points[index].workoutId} cx={x} cy={y} r={3} className="fill-link" />
          ))}
        </svg>
      )}
      {bodyweights.length > 0 && (
        <ul aria-label="Bodyweights" className="flex flex-col divide-y divide-line rounded-lg border bg-surface">
          {[...bodyweights].reverse().map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 px-3 py-2">
              <span className="font-medium tabular-nums">{formatWeight(entry.weightGrams, weightUnit)}</span>
              <span className="flex-1 text-sm text-muted">{formatWorkoutDate(entry.measuredAt)}</span>
              <button
                type="button"
                aria-label={`Delete bodyweight of ${formatWorkoutDate(entry.measuredAt)}`}
                onClick={() => remove(entry.id)}
                className="rounded p-1 text-muted"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
