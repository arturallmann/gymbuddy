'use client';

import { useRouter } from 'next/navigation';
import { useDatabase } from '@/db/DatabaseContext';
import { addTemplateToWorkout } from '@/db/templateWorkouts';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import SavedSupersetPicker from './SavedSupersetPicker';
import BackLink from '@/components/ui/BackLink';

// Saved supersets, from the top bar of the "Add exercise" page. Tapping one adds it to the
// active workout and goes back to the workout.
export default function AddSavedSupersetView() {
  const db = useDatabase();
  const router = useRouter();
  const { workout } = useActiveWorkout();

  if (workout === undefined) {
    return null;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-6">
      <header className="flex items-center gap-4">
        <BackLink href="/workout/add" label="Back to add exercise" />
        <h1 className="min-w-0 text-2xl font-bold">Saved supersets</h1>
      </header>
      {workout ? (
        <SavedSupersetPicker
          onPick={async (templateId) => {
            await addTemplateToWorkout(db, workout.id, templateId);
            router.push('/workout');
          }}
        />
      ) : (
        <p className="text-muted">No active workout.</p>
      )}
    </main>
  );
}
