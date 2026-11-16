import Link from 'next/link';
import TemplateList from '@/components/TemplateList';

export default function RoutinesPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <Link href="/" className="shrink-0 text-sky-600">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Routines</h1>
      </header>
      <TemplateList kind="routine" />
    </main>
  );
}
