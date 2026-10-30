import Link from 'next/link';
import SavedSupersets from '@/components/SavedSupersets';

export default function SavedSupersetsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <Link href="/" className="shrink-0 text-sky-600">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Saved supersets</h1>
      </header>
      <SavedSupersets />
    </main>
  );
}
