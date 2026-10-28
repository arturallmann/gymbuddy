'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { getDatabase } from '@/db/client';
import { DatabaseContext } from '@/db/DatabaseContext';
import type { AppDatabase } from '@/db/driver';

// Opens the database and runs migrations before the app shows any page.
export default function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDatabase()
      .then(setDb)
      .catch((reason: unknown) => {
        console.error(reason);
        setError(reason instanceof Error ? reason.message : String(reason));
      });
  }, []);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="font-bold">The database could not open.</p>
        <p className="text-sm text-gray-500">{error}</p>
      </main>
    );
  }
  if (!db) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-gray-500">
        Loading…
      </main>
    );
  }
  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
}
