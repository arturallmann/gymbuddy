'use client';

import { useSettings } from '@/hooks/useSettings';
import { muscleGroupLabel } from '@/lib/muscleMap';
import { formatSets, type MuscleGroupSummary } from '@/lib/statistics';
import { formatWeight } from '@/lib/units';

type Props = {
  // The chosen muscle group, or null to ask for a tap.
  muscleGroup: string | null;
  summary: MuscleGroupSummary | undefined;
  // Divide by this for values per week (the weeks of the time span); 1 for one workout.
  weeks: number;
  emptyText: string;
};

const round = (value: number) => Math.round(value * 10) / 10;

// The numbers of the muscle group chosen on the muscle map (decision 046): sets (1 for primary, ½ for
// secondary), volume (shared the same way) and the exercises that trained it.
export default function MuscleGroupCard({ muscleGroup, summary, weeks, emptyText }: Props) {
  const { weightUnit } = useSettings().settings;
  const perWeek = weeks > 1 ? ' per week' : '';
  if (!muscleGroup) {
    return <p className="text-center text-sm text-muted">Tap a muscle group to see its sets and exercises.</p>;
  }
  return (
    <section aria-label={summary?.name ?? muscleGroupLabel(muscleGroup)} className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-3">
      <h2 className="font-semibold">{summary?.name ?? muscleGroupLabel(muscleGroup)}</h2>
      {!summary ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Sets{perWeek}</dt>
            <dd className="font-semibold tabular-nums">{formatSets(round((summary.primarySets + summary.secondarySets) / weeks))}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">As primary · as secondary (½)</dt>
            <dd className="tabular-nums">
              {formatSets(round(summary.primarySets / weeks))} · {formatSets(round(summary.secondarySets / weeks))}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Volume{perWeek}</dt>
            <dd className="tabular-nums">{summary.volume ? formatWeight(summary.volume / weeks, weightUnit) : '–'}</dd>
          </div>
          <dd className="text-muted">{summary.exercises.join(', ')}</dd>
        </dl>
      )}
    </section>
  );
}
