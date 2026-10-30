'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listExercisePreferences } from '@/db/preferences';
import type { ExercisePreferences } from '@/db/schema';
import { deleteTemplate, listTemplates, renameTemplate, type TemplateItem } from '@/db/templates';
import { useSettings } from '@/hooks/useSettings';
import { formatTargets } from '@/lib/templates';
import { formatDuration, getUnits } from '@/lib/units';
import ConfirmAction from './ConfirmAction';

type Loaded = { items: TemplateItem[]; preferences: Map<string, ExercisePreferences> };

// The user's saved supersets with their exercises, targets and rest, to rename or delete.
export default function SavedSupersets() {
  const db = useDatabase();
  const { settings } = useSettings();
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async (): Promise<Loaded> => {
    const items = await listTemplates(db, settings.userId, 'superset');
    const exerciseIds = [...new Set(items.flatMap((item) => item.exercises.map((exercise) => exercise.exerciseId)))];
    return { items, preferences: await listExercisePreferences(db, settings.userId, exerciseIds) };
  }, [db, settings.userId]);

  useEffect(() => {
    let current = true;
    load()
      .then((result) => current && setLoaded(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [load]);

  if (!loaded) {
    return null;
  }
  if (loaded.items.length === 0) {
    return <p className="text-gray-500">No saved supersets yet. Save one from a superset in a workout.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {loaded.items.map((item) => {
        const rest = item.exercises[0]?.restSeconds ?? null;
        return (
          <li key={item.id} aria-label={item.name} className="flex flex-col gap-2 rounded-lg border p-3">
            {renaming?.id === item.id ? (
              <form
                aria-label="Rename"
                className="flex gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!renaming.name.trim()) return;
                  await renameTemplate(db, settings.userId, item.id, renaming.name);
                  setRenaming(null);
                  setLoaded(await load());
                }}
              >
                <input
                  aria-label="Name"
                  value={renaming.name}
                  onChange={(event) => setRenaming({ id: item.id, name: event.target.value })}
                  className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-black"
                />
                <button type="submit" className="shrink-0 rounded-lg bg-sky-600 px-3 py-2 text-white">
                  Save
                </button>
                <button type="button" onClick={() => setRenaming(null)} className="shrink-0 rounded-lg border px-3 py-2">
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-start gap-2">
                <h2 className="min-w-0 flex-1 break-words font-semibold">{item.name}</h2>
                <button type="button" onClick={() => setRenaming({ id: item.id, name: item.name })} className="shrink-0 text-sm text-sky-600">
                  Rename
                </button>
              </div>
            )}
            {rest !== null && <p className="text-xs uppercase text-sky-500">Rest {formatDuration(rest)}</p>}
            <ol className="flex flex-col gap-1 text-sm">
              {item.exercises.map((exercise) => {
                const targets = formatTargets(exercise, exercise.loadType, getUnits(settings, loaded.preferences.get(exercise.exerciseId)));
                return (
                  <li key={exercise.id} className="break-words">
                    {exercise.name}
                    {targets && <span className="text-gray-500"> · {targets}</span>}
                  </li>
                );
              })}
            </ol>
            <ConfirmAction
              label="Delete saved superset"
              question="Delete this saved superset? Workouts that used it keep their exercises and sets."
              confirmLabel="Delete"
              keepLabel="Keep it"
              onConfirm={async () => {
                await deleteTemplate(db, settings.userId, item.id);
                setLoaded(await load());
              }}
            />
          </li>
        );
      })}
    </ul>
  );
}
