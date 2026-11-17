'use client';

import { useEffect } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { updateLibraryOnline } from '@/db/libraryUpdate';
import * as libraryDownload from '@/native/libraryDownload';

// Waits a moment after the app starts, so the first page is never slower.
const START_DELAY_MS = 5000;

// Runs the online library update in the background when the phone is online (decision 038).
// Shows nothing; a failure only goes to the console, and the next check tries again.
export default function LibraryUpdater() {
  const db = useDatabase();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!navigator.onLine) return;
      updateLibraryOnline(db, libraryDownload).catch((reason: unknown) => console.warn('Library update failed', reason));
    }, START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [db]);
  return null;
}
