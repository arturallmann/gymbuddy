import Link from 'next/link';
import ExerciseBrowser from '@/components/ExerciseBrowser';

export default function ExercisesPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <Link href="/" className="text-sky-600">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Exercises</h1>
      </header>
      <ExerciseBrowser />
    </main>
  );
}
