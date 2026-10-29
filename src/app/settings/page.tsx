'use client';

import Link from 'next/link';
import ExportData from '@/components/ExportData';
import FeatureSettings from '@/components/FeatureSettings';
import UnitSettings from '@/components/UnitSettings';

export default function SettingsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-8 p-6">
      <header className="flex items-center gap-4">
        <Link href="/" className="text-sky-600">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Units</h2>
        <UnitSettings />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Features</h2>
        <FeatureSettings />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Export</h2>
        <ExportData />
      </section>
    </main>
  );
}
