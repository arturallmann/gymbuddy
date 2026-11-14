'use client';

import Link from 'next/link';
import { useState } from 'react';

type Props = {
  // "Save superset" or "Save as routine".
  label: string;
  defaultName: string;
  // Where the saved templates are listed, such as "/routines".
  listHref: string;
  listLabel: string;
  onSave: (name: string) => Promise<void>;
  // In a page's top bar: a small button, and the form and the message on their own line below
  // (the top bar wraps).
  compact?: boolean;
};

// Asks for a name, then saves a template: a saved superset or a routine.
export default function SaveTemplate({ label, defaultName, listHref, listLabel, onSave, compact = false }: Props) {
  const [name, setName] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  if (name === null) {
    return (
      <div className={compact ? 'contents' : 'flex flex-col items-start gap-2'}>
        <button
          type="button"
          onClick={() => {
            setSaved(null);
            setName(defaultName);
          }}
          className={
            compact
              ? 'shrink-0 rounded-lg border bg-surface px-3 py-2 text-sm font-semibold'
              : 'rounded-lg border bg-surface px-4 py-2 font-semibold'
          }
        >
          {label}
        </button>
        {saved && (
          <p role="status" className={`text-sm text-muted ${compact ? 'basis-full' : ''}`}>
            Saved as “{saved}”.{' '}
            <Link href={listHref} className="text-link">
              {listLabel}
            </Link>
          </p>
        )}
      </div>
    );
  }
  return (
    <form
      aria-label={label}
      className={`flex flex-col gap-2 ${compact ? 'basis-full' : ''}`}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim()) return;
        await onSave(name);
        setSaved(name.trim());
        setName(null);
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} className="w-full min-w-0 rounded-lg border px-3 py-2" />
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary disabled:opacity-50"
        >
          Save
        </button>
        <button type="button" onClick={() => setName(null)} className="rounded-lg border bg-surface px-4 py-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
