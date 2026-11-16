'use client';

import { useSettings } from '@/hooks/useSettings';
import { formatWeight } from '@/lib/units';

type Props = { volume: number | null; sets: number; exercises: number; records: number };

// Totals of one workout (decision 043): volume (in the settings' weight unit, because it adds up
// several exercises), sets, exercises and the number of personal records it reached.
export default function WorkoutSummary({ volume, sets, exercises, records }: Props) {
  const { weightUnit } = useSettings().settings;
  const tiles = [
    { label: 'Volume', value: volume ? formatWeight(volume, weightUnit) : '–' },
    { label: 'Sets', value: String(sets) },
    { label: 'Exercises', value: String(exercises) },
    { label: 'PRs', value: String(records) },
  ];
  return (
    <section aria-label="Workout summary">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col rounded-lg border border-line bg-surface p-3">
            <dt className="text-xs text-muted">{tile.label}</dt>
            <dd className="text-lg font-bold tabular-nums">{tile.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
