'use client';

import type { WorkoutExerciseItem } from '@/db/workouts';
import { useGroupSets } from '@/hooks/useGroupSets';
import { roundRows } from '@/lib/rounds';
import { formatSet } from '@/lib/sets';
import { formatDuration } from '@/lib/units';

type Props = {
  members: WorkoutExerciseItem[];
  workoutId: string;
  restSeconds: number | null;
};

// The inside of an exercise group's card on the workout page: its exercises and one row per round.
export default function GroupRounds({ members, workoutId, restSeconds }: Props) {
  const { data } = useGroupSets(members, workoutId);
  const rows = data ? roundRows(data.sets) : [];
  return (
    <span className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase text-sky-500">
        Superset{restSeconds !== null && ` · Rest ${formatDuration(restSeconds)}`}
      </span>
      <span className="font-semibold">{members.map((member) => member.name).join(' + ')}</span>
      {data && rows.length === 0 && <span className="text-sm text-gray-500">No rounds yet</span>}
      {data &&
        rows.map((row, round) => (
          <span key={round} className="block text-sm text-gray-500">
            Round {round + 1}:{' '}
            {row
              .map((set, index) => (set ? formatSet(set, members[index].loadType, data.units[index]) : '—'))
              .join(' · ')}
          </span>
        ))}
    </span>
  );
}
