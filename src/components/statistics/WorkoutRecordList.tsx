'use client';

import type { WorkoutExerciseItem } from '@/db/workouts';
import { useExercisePreferences } from '@/hooks/useExercisePreferences';
import { PERSONAL_RECORD_LABELS, formatPersonalRecord, type PersonalRecordKind } from '@/lib/statistics';

type Records = Map<string, { kind: PersonalRecordKind; value: number }[]>;

function RecordRows({ item, records }: { item: WorkoutExerciseItem; records: { kind: PersonalRecordKind; value: number }[] }) {
  const { units } = useExercisePreferences(item.exerciseId);
  return records.map((record) => (
    <li key={record.kind} className="flex flex-wrap items-center gap-2 text-sm">
      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent">PR</span>
      <span>
        {item.name} · {PERSONAL_RECORD_LABELS[record.kind]} {formatPersonalRecord(record.kind, record.value, item.loadType, units)}
      </span>
    </li>
  ));
}

// The personal records a workout reached, one line each, in the exercise's units (decision 043).
export default function WorkoutRecordList({ items, records }: { items: WorkoutExerciseItem[]; records: Records }) {
  const first = items.filter((item, index) => items.findIndex((other) => other.exerciseId === item.exerciseId) === index);
  const withRecords = first.filter((item) => (records.get(item.exerciseId) ?? []).length > 0);
  if (withRecords.length === 0) return null;
  return (
    <section aria-label="Personal records" className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
      <h2 className="font-semibold">Personal records</h2>
      <ul className="flex flex-col gap-1">
        {withRecords.map((item) => (
          <RecordRows key={item.id} item={item} records={records.get(item.exerciseId)!} />
        ))}
      </ul>
    </section>
  );
}
