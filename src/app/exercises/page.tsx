import { Suspense } from 'react';
import ExerciseBrowser from '@/components/exercises/ExerciseBrowser';
import BackLink from '@/components/ui/BackLink';

export default function ExercisesPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <BackLink href="/" label="Back" />
        <h1 className="text-2xl font-semibold">Exercises</h1>
      </header>
      {/* The filters are in the address, which a static export only knows in the browser. */}
      <Suspense>
        <ExerciseBrowser />
      </Suspense>
    </main>
  );
}
