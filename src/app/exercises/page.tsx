import ExerciseBrowser from '@/components/ExerciseBrowser';
import BackLink from '@/components/BackLink';

export default function ExercisesPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <BackLink href="/" label="Back" />
        <h1 className="text-2xl font-bold">Exercises</h1>
      </header>
      <ExerciseBrowser />
    </main>
  );
}
