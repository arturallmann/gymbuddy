'use client';

import { createContext, useContext } from 'react';
import type { AppDatabase } from './driver';

export const DatabaseContext = createContext<AppDatabase | null>(null);

// Returns the open database. Only works inside <DatabaseProvider>.
export function useDatabase(): AppDatabase {
  const db = useContext(DatabaseContext);
  if (!db) {
    throw new Error('useDatabase must be used inside <DatabaseProvider>');
  }
  return db;
}
