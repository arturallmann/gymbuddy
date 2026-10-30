'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { GroupDetail } from '@/db/groups';
import { useGroupSets } from '@/hooks/useGroupSets';
import { useFeatures } from '@/hooks/useSettings';
import { nextMemberIndex, roundComplete, roundRows } from '@/lib/rounds';
import { formatSet, setFormValues, type SetValues } from '@/lib/sets';
import { targetsAsSet } from '@/lib/templates';
import { stepDuration } from '@/lib/timer';
import { formatDuration } from '@/lib/units';
import RestTimer from './RestTimer';
import SaveSuperset from './SaveSuperset';
import SetForm from './SetForm';

type Props = {
  detail: GroupDetail;
  restTimer: boolean;
  onRest: (seconds: number) => Promise<void>;
  onUngroup?: () => Promise<void>;
  // Without onSaveTemplate there is no "Save superset" (supersets or templates toggle off).
  onSaveTemplate?: (name: string) => Promise<void>;
};

// The rounds table and the guided set form of one exercise group. Tapping a set edits it;
// tapping an empty cell logs that exercise next instead of the one in turn.
export default function GroupLog({ detail, restTimer, onRest, onUngroup, onSaveTemplate }: Props) {
  const { group, members } = detail;
  const features = useFeatures();
  const { data, add, update } = useGroupSets(members, group.workoutId);
  // The member the user picked by tapping an empty cell; otherwise the next one in turn.
  const [picked, setPicked] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ setId: string; member: number } | null>(null);
  const [resting, setResting] = useState(false);

  if (!data) {
    return null;
  }
  const counts = data.sets.map((list) => list.length);
  const member = picked ?? nextMemberIndex(counts);
  const round = counts[member] + 1;
  const rows = roundRows(data.sets);
  const rest = group.restSeconds ?? 0;
  const editedSet = editing ? data.sets[editing.member].find((set) => set.id === editing.setId) ?? null : null;

  const log = async (values: SetValues) => {
    await add(member, values);
    setPicked(null);
    const after = counts.map((count, index) => (index === member ? count + 1 : count));
    if (restTimer && rest > 0 && roundComplete(after)) {
      setResting(true);
    }
  };

  return (
    <>
      <ul className="flex flex-col gap-1">
        {members.map((item) => (
          <li key={item.id}>
            <Link href={`/workout/exercise?id=${item.id}`} className="text-sky-600">
              {item.name}
            </Link>
          </li>
        ))}
      </ul>

      {restTimer && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-400">Rest after each round</span>
          <button type="button" aria-label="Less rest" onClick={() => onRest(stepDuration(rest, -1))} className="rounded border px-2">
            −
          </button>
          <span className="tabular-nums">{formatDuration(rest)}</span>
          <button type="button" aria-label="More rest" onClick={() => onRest(stepDuration(rest, 1))} className="rounded border px-2">
            +
          </button>
        </div>
      )}

      {resting && <RestTimer seconds={rest} onClose={() => setResting(false)} />}

      {editing && editedSet ? (
        <section aria-label="Edit set" className="flex flex-col gap-3">
          <h2 className="font-semibold">
            Round {data.sets[editing.member].indexOf(editedSet) + 1} · {members[editing.member].name}
          </h2>
          <SetForm
            key={`edit-${editedSet.id}`}
            exercise={members[editing.member]}
            units={data.units[editing.member]}
            features={features}
            initial={setFormValues(editedSet, data.units[editing.member], 'edit')}
            base={editedSet}
            submitLabel="Save set"
            onCancel={() => setEditing(null)}
            onLog={async (values) => {
              await update(editedSet.id, values);
              setEditing(null);
            }}
          />
        </section>
      ) : (
        <section aria-label="Next set" className="flex flex-col gap-3">
          <h2 className="font-semibold">
            Round {round} · {members[member].name}
          </h2>
          <SetForm
            key={`new-${member}-${counts[member]}`}
            exercise={members[member]}
            units={data.units[member]}
            features={features}
            initial={setFormValues(
              data.lastSets[member][counts[member]] ?? data.sets[member].at(-1) ?? targetsAsSet(data.targets[member]),
              data.units[member],
            )}
            onLog={log}
          />
        </section>
      )}

      {rows.length > 0 && (
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">Rounds</caption>
          <thead>
            <tr>
              <th className="w-10 text-left text-gray-500">#</th>
              {members.map((item) => (
                <th key={item.id} className="break-words text-left font-semibold">
                  {item.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t">
                <td className="py-2 text-gray-500">{index + 1}</td>
                {row.map((set, memberIndex) => (
                  <td key={members[memberIndex].id} className="py-2">
                    {set ? (
                      <button
                        type="button"
                        aria-label={`Edit round ${index + 1}, ${members[memberIndex].name}`}
                        onClick={() => setEditing({ setId: set.id, member: memberIndex })}
                        className="break-words text-left"
                      >
                        {formatSet(set, members[memberIndex].loadType, data.units[memberIndex])}
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Log round ${index + 1}, ${members[memberIndex].name}`}
                        onClick={() => {
                          setEditing(null);
                          setPicked(memberIndex);
                        }}
                        className="text-gray-500"
                      >
                        —
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {onSaveTemplate && <SaveSuperset names={members.map((item) => item.name)} onSave={onSaveTemplate} />}

      {onUngroup && (
        <button type="button" onClick={onUngroup} className="self-start text-sky-600">
          Ungroup
        </button>
      )}
    </>
  );
}
