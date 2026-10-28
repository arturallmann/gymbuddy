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

  useEffect(() => {
    getLocalSettings(db).then(setSettings);
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

  if (!value) {
    return null;
  }
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
