'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { changeGroupRest, getWorkoutGroup, ungroupWorkoutExercises, type GroupDetail } from '@/db/groups';
import { findSavedSuperset, saveGroupAsTemplate, updateSavedSuperset, type SavedSupersetMatch } from '@/db/templates';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import GroupLog from './GroupLog';
import BackLink from '@/components/ui/BackLink';

// One exercise group: a rounds table and the set form for the next exercise in turn
// (A → B → … → rest → A). The group id comes from the address: /workout/group?id=…
export default function GroupView() {
  const db = useDatabase();
  const router = useRouter();
  const features = useFeatures();
  const { userId } = useSettings().settings;
  const id = useSearchParams().get('id');
  const [detail, setDetail] = useState<GroupDetail | null | undefined>(undefined);
  // The saved superset "Save superset" changes instead of saving a second one (5.2.2, decision 051).
  const [match, setMatch] = useState<SavedSupersetMatch | null>(null);

  const reload = useCallback(async () => setDetail(id ? await getWorkoutGroup(db, id) : null), [db, id]);
  const reloadMatch = useCallback(async () => setMatch(id ? await findSavedSuperset(db, userId, id) : null), [db, userId, id]);
  useEffect(() => {
    let current = true;
    Promise.all([id ? getWorkoutGroup(db, id) : null, id ? findSavedSuperset(db, userId, id) : null])
      .then(([loaded, found]) => {
        if (!current) return;
        setDetail(loaded);
        setMatch(found);
      })
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, id]);

  if (detail === undefined) {
    return null;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <BackLink href="/workout" label="Back to workout" />
        <h1 className="text-2xl font-bold">Superset</h1>
      </header>
      {!detail ? (
        <p className="text-muted">This superset does not exist.</p>
      ) : (
        <GroupLog
          detail={detail}
          restTimer={features.restTimer}
          onRest={async (seconds) => {
            await changeGroupRest(db, detail.group.id, seconds);
            await reload();
          }}
          onSaveTemplate={
            features.supersets && features.templates
              ? async (name) => {
                  await saveGroupAsTemplate(db, userId, detail.group.id, name);
                  await reloadMatch();
                }
              : undefined
          }
          savedSuperset={
            match && {
              name: match.name,
              onUpdate: async () => {
                await updateSavedSuperset(db, userId, match.id, detail.group.id);
              },
            }
          }
          onUngroup={
            features.supersets
              ? async () => {
                  await ungroupWorkoutExercises(db, detail.group.id);
                  router.push('/workout');
                }
              : undefined
          }
        />
      )}
    </main>
  );
}
