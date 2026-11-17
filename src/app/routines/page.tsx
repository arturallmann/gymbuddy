import TemplateList from '@/components/templates/TemplateList';
import BackLink from '@/components/ui/BackLink';

export default function RoutinesPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <BackLink href="/" label="Back" />
        <h1 className="text-2xl font-bold">Routines</h1>
      </header>
      <TemplateList kind="routine" />
    </main>
  );
}
