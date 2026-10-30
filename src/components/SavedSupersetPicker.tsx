'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listTemplates, type TemplateItem } from '@/db/templates';
import { useSettings } from '@/hooks/useSettings';

type Props = {
  onPick: (templateId: string) => void;
  onClose: () => void;
};

// The user's saved supersets. Tapping one adds it to the workout.
export default function SavedSupersetPicker({ onPick, onClose }: Props) {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const [items, setItems] = useState<TemplateItem[] | undefined>(undefined);

  useEffect(() => {
    let current = true;
    listTemplates(db, userId, 'superset')
      .then((loaded) => current && setItems(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId]);

  return (
    <section aria-label="Add saved superset" className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <h2 className="min-w-0 flex-1 font-semibold">Add saved superset</h2>
        <button type="button" onClick={onClose} className="shrink-0 text-sky-600">
          Cancel
        </button>
      </div>
      {items && items.length === 0 && <p className="text-gray-500">No saved supersets yet.</p>}
      <ul className="flex flex-col">
        {items?.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onPick(item.id)} className="w-full break-words border-b py-3 text-left">
              <span className="block font-semibold">{item.name}</span>
              <span className="block text-sm text-gray-500">
                {item.exercises.map((exercise) => exercise.name).join(' + ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
