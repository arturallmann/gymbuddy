'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listExercisePreferences } from '@/db/preferences';
import type { ExercisePreferences, TemplateKind } from '@/db/schema';
import { deleteTemplate, listTemplates, renameTemplate, startWorkoutFromRoutine, type TemplateItem } from '@/db/templates';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { useSettings } from '@/hooks/useSettings';
import { toBlocks } from '@/lib/blocks';
import { formatTargets } from '@/lib/templates';
import { formatDuration, getUnits } from '@/lib/units';
import ConfirmAction from './ConfirmAction';

type Loaded = { items: TemplateItem[]; preferences: Map<string, ExercisePreferences> };

const TEXT: Record<TemplateKind, { empty: string; delete: string; question: string }> = {
  superset: {
    empty: 'No saved supersets yet. Save one from a superset in a workout.',
    delete: 'Delete saved superset',
    question: 'Delete this saved superset? Workouts that used it keep their exercises and sets.',
  },
  routine: {
    empty: 'No routines yet. Save one from a workout.',
    delete: 'Delete routine',
    question: 'Delete this routine? Workouts that started from it keep their exercises and sets.',
  },
};

// The user's templates of one kind with their exercises, groups, targets and rest, to rename or
// delete. A routine also has "Start", which starts a workout from it (decision 027).
export default function TemplateList({ kind }: { kind: TemplateKind }) {
  const db = useDatabase();
  const router = useRouter();
  const { settings } = useSettings();
  const { workout } = useActiveWorkout();
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async (): Promise<Loaded> => {
    const items = await listTemplates(db, settings.userId, kind);
    const exerciseIds = [...new Set(items.flatMap((item) => item.exercises.map((exercise) => exercise.exerciseId)))];
    return { items, preferences: await listExercisePreferences(db, settings.userId, exerciseIds) };
  }, [db, settings.userId, kind]);

  useEffect(() => {
    let current = true;
    load()
      .then((result) => current && setLoaded(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [load]);

  if (!loaded || workout === undefined) {
    return null;
  }
  if (loaded.items.length === 0) {
    return <p className="text-gray-500">{TEXT[kind].empty}</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {kind === 'routine' && workout && (
        <p className="text-sm text-gray-400">
          A workout is active.{' '}
          <Link href="/workout" className="text-sky-600">
            Continue workout
          </Link>
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {loaded.items.map((item) => {
          const exerciseText = (exercise: TemplateItem['exercises'][number]) => {
            const targets = formatTargets(
              exercise,
              exercise.loadType,
              getUnits(settings, loaded.preferences.get(exercise.exerciseId)),
            );
            return (
              <>
                {exercise.name}
                {targets && <span className="text-gray-500"> · {targets}</span>}
              </>
            );
          };
          const blocks = toBlocks(item.exercises.map((exercise) => ({ ...exercise, groupId: exercise.groupKey })));
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
                  <button
                    type="button"
                    onClick={() => setRenaming({ id: item.id, name: item.name })}
                    className="shrink-0 text-sm text-sky-600"
                  >
                    Rename
                  </button>
                </div>
              )}
              <ol className="flex flex-col gap-1 text-sm">
                {blocks.map((block) =>
                  block.kind === 'single' ? (
                    <li key={block.item.id} className="break-words">
                      {exerciseText(block.item)}
                    </li>
                  ) : (
                    <li key={block.groupId} className="flex flex-col gap-1">
                      <span className="text-xs uppercase text-sky-500">
                        Superset
                        {block.items[0].restSeconds !== null && ` · Rest ${formatDuration(block.items[0].restSeconds)}`}
                      </span>
                      <ol className="flex flex-col gap-1 border-l-2 border-sky-700 pl-3">
                        {block.items.map((exercise) => (
                          <li key={exercise.id} className="break-words">
                            {exerciseText(exercise)}
                          </li>
                        ))}
                      </ol>
                    </li>
                  ),
                )}
              </ol>
              {kind === 'routine' && !workout && (
                <button
                  type="button"
                  onClick={async () => {
                    await startWorkoutFromRoutine(db, settings.userId, item.id);
                    router.push('/workout');
                  }}
                  className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white"
                >
                  Start
                </button>
              )}
              <ConfirmAction
                label={TEXT[kind].delete}
                question={TEXT[kind].question}
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
    </div>
  );
}
