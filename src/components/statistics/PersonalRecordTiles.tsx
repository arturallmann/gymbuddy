'use client';

import type { LoadType } from '@/db/schema';
import { formatWorkoutDate } from '@/lib/dates';
import { PERSONAL_RECORD_LABELS, formatPersonalRecord, type PersonalRecord } from '@/lib/personalRecords';
import type { Units } from '@/lib/units';

type Props = { records: PersonalRecord[]; loadType: LoadType; units: Units };

const dateOnly = (date: Date) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);

// The personal records of one exercise as small tiles (decision 043): value, what it is and when.
export default function PersonalRecordTiles({ records, loadType, units }: Props) {
  if (records.length === 0) return null;
  return (
    <section aria-label="Personal records" className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted">Personal records</h2>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(6.25rem,1fr))] gap-2">
        {records.map((record) => (
          <li key={record.kind} className="flex flex-col rounded-lg border bg-surface p-3">
            <span className="text-xs text-muted">{PERSONAL_RECORD_LABELS[record.kind]}</span>
            <span className="text-xl font-medium tabular-nums">{formatPersonalRecord(record.kind, record.value, loadType, units)}</span>
            <span className="text-xs text-muted" title={formatWorkoutDate(record.startedAt)}>
              {dateOnly(record.startedAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
