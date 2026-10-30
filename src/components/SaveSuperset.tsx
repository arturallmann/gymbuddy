'use client';

import Link from 'next/link';
import { useState } from 'react';
import { defaultSupersetName } from '@/lib/templates';

type Props = {
  names: string[];
  onSave: (name: string) => Promise<void>;
};

// "Save superset": asks for a name, then saves the group as a saved superset.
export default function SaveSuperset({ names, onSave }: Props) {
  const [name, setName] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  if (name === null) {
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => {
            setSaved(null);
            setName(defaultSupersetName(names));
          }}
          className="rounded-lg border px-4 py-2 font-semibold"
        >
          Save superset
        </button>
        {saved && (
          <p role="status" className="text-sm text-gray-400">
            Saved as “{saved}”.{' '}
            <Link href="/saved-supersets" className="text-sky-600">
              Saved supersets
            </Link>
          </p>
        )}
      </div>
    );
  }
  return (
    <form
      aria-label="Save superset"
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
