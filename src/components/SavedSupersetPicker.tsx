'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listTemplates, type TemplateItem } from '@/db/templates';
import { useSettings } from '@/hooks/useSettings';

type Props = {
  onPick: (templateId: string) => void;
};

// The user's saved supersets. Tapping one adds it to the workout.
export default function SavedSupersetPicker({ onPick }: Props) {
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
    <section aria-label="Saved supersets" className="flex flex-col">
      {items && items.length === 0 && <p className="text-muted">No saved supersets yet.</p>}
      <ul className="flex flex-col">
        {items?.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onPick(item.id)} className="w-full break-words border-b border-line py-3 text-left">
              <span className="block font-semibold">{item.name}</span>
              <span className="block text-sm text-muted">
                {item.exercises.map((exercise) => exercise.name).join(' + ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
