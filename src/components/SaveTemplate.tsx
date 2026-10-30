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
};

// Asks for a name, then saves a template: a saved superset or a routine.
export default function SaveTemplate({ label, defaultName, listHref, listLabel, onSave }: Props) {
  const [name, setName] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  if (name === null) {
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => {
            setSaved(null);
            setName(defaultName);
          }}
          className="rounded-lg border px-4 py-2 font-semibold"
        >
          {label}
        </button>
        {saved && (
          <p role="status" className="text-sm text-gray-400">
            Saved as “{saved}”.{' '}
            <Link href={listHref} className="text-sky-600">
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
      className="flex flex-col gap-2"
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
        <input value={name} onChange={(event) => setName(event.target.value)} className="w-full min-w-0 rounded-lg border px-3 py-2 text-black" />
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>
        <button type="button" onClick={() => setName(null)} className="rounded-lg border px-4 py-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
