'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { changeGroupRest, getWorkoutGroup, ungroupWorkoutExercises, type GroupDetail } from '@/db/groups';
import { useFeatures } from '@/hooks/useSettings';
import GroupLog from './GroupLog';

// One exercise group: a rounds table and the set form for the next exercise in turn
// (A → B → … → rest → A). The group id comes from the address: /workout/group?id=…
export default function GroupView() {
  const db = useDatabase();
  const router = useRouter();
  const features = useFeatures();
  const id = useSearchParams().get('id');
  const [detail, setDetail] = useState<GroupDetail | null | undefined>(undefined);

  const reload = useCallback(async () => setDetail(id ? await getWorkoutGroup(db, id) : null), [db, id]);
  useEffect(() => {
    let current = true;
    (id ? getWorkoutGroup(db, id) : Promise.resolve(null))
      .then((loaded) => current && setDetail(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, id]);

  if (detail === undefined) {
    return null;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <Link href="/workout" className="shrink-0 text-sky-600">
          ← Workout
        </Link>
        <h1 className="text-2xl font-bold">Superset</h1>
      </header>
      {!detail ? (
        <p className="text-gray-500">This superset does not exist.</p>
      ) : (
        <GroupLog
          detail={detail}
          restTimer={features.restTimer}
          onRest={async (seconds) => {
            await changeGroupRest(db, detail.group.id, seconds);
            await reload();
          }}
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
