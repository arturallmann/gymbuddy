'use client';

import BodySettings from '@/components/settings/BodySettings';
import ExportData from '@/components/settings/ExportData';
import FeatureSettings from '@/components/settings/FeatureSettings';
import ImportData from '@/components/settings/ImportData';
import ThemeSettings from '@/components/settings/ThemeSettings';
import UnitSettings from '@/components/settings/UnitSettings';
import BackLink from '@/components/ui/BackLink';

export default function SettingsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-8 p-6">
      <header className="flex items-center gap-4">
        <BackLink href="/" label="Back" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Units</h2>
        <UnitSettings />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Body</h2>
        <BodySettings />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Theme</h2>
        <ThemeSettings />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Features</h2>
        <FeatureSettings />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Export and import</h2>
        <ExportData />
        <ImportData />
      </section>
    </main>
  );
}
