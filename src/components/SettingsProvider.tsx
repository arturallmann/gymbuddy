'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import type { UserSettings } from '@/db/schema';
import { getLocalSettings, updateSettings, type SettingsChange } from '@/db/settings';
import { SettingsContext } from '@/hooks/useSettings';

// Loads the settings of the local user before the app shows any page.
export default function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useDatabase();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLocalSettings(db)
      .then((loaded) => (loaded ? setSettings(loaded) : setError('No settings row was found.')))
      .catch((reason: unknown) => {
        console.error(reason);
        setError(reason instanceof Error ? reason.message : String(reason));
      });
  }, [db]);

  const update = useCallback(
    async (change: SettingsChange) => {
      if (!settings) return;
      setSettings(await updateSettings(db, settings.id, change));
    },
    [db, settings],
  );

  const value = useMemo(
    () => (settings ? { settings, updateSettings: update } : null),
    [settings, update],
  );

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="font-bold">The settings could not load.</p>
        <p className="text-sm text-gray-500">{error}</p>
      </main>
    );
  }
  if (!value) {
    return null;
  }
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
