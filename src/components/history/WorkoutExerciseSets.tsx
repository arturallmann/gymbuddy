'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import type { WorkoutSet } from '@/db/schema';
import { listSets } from '@/db/sets';
import { type WorkoutExerciseItem } from '@/db/workoutExercises';
import { useExercisePreferences } from '@/hooks/useExercisePreferences';
import { PERSONAL_RECORD_LABELS, formatPersonalRecord, type PersonalRecordKind } from '@/lib/personalRecords';
import SetList from '@/components/workout/SetList';

type Props = {
  item: WorkoutExerciseItem;
  // The personal records the workout reached with this exercise (decision 043).
  records?: { kind: PersonalRecordKind; value: number }[];
};

// One workout exercise of a past workout: its name, the personal records it reached and its sets, read-only.
export default function WorkoutExerciseSets({ item, records = [] }: Props) {
  const db = useDatabase();
  const { units } = useExercisePreferences(item.exerciseId);
  const [sets, setSets] = useState<WorkoutSet[] | undefined>(undefined);

  useEffect(() => {
    let current = true;
    listSets(db, item.id)
      .then((loaded) => current && setSets(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, item.id]);

  return (
    <section aria-label={item.name} className="flex flex-col gap-2 rounded-lg border bg-surface p-3">
      <h2 className="break-words font-medium">{item.name}</h2>
      {records.length > 0 && (
        <ul aria-label="Personal records" className="flex flex-wrap gap-2">
          {records.map((record) => (
            <li key={record.kind} className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-on-accent">
              PR · {PERSONAL_RECORD_LABELS[record.kind]} {formatPersonalRecord(record.kind, record.value, item.loadType, units)}
            </li>
          ))}
        </ul>
      )}
      {sets && sets.length === 0 && <p className="text-sm text-muted">No sets</p>}
      {sets && <SetList sets={sets} loadType={item.loadType} units={units} />}
    </section>
  );
}
