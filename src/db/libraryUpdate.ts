// The online library update (decision 038): when the phone is online, at most once a day, the app
// asks free-exercise-db for a newer commit. When there is one, it downloads and checks the library
// file, downloads the images it does not bundle or that changed, and only then updates the library
// in one transaction. Any failure leaves the library as it was; the next check tries again.
import libraryData from '../../data/free-exercise-db/version.json';
import { imagesToDownload, isCheckDue, parseLibrary, storedLibraryImage } from '@/lib/libraryUpdate';
import { readAppState, writeAppState } from './appState';
import type { AppDatabase } from './driver';
import { seedLibrary, type SourceExercise } from './seed';

export type LibraryDownload = {
  fetchHeadCommit: () => Promise<string>;
  fetchLibraryFile: (commit: string) => Promise<unknown>;
  fetchChangedFiles: (base: string, head: string) => Promise<string[] | null>;
  downloadImage: (commit: string, path: string, file: string) => Promise<void>;
};

export type LibraryUpdateResult = 'not-due' | 'current' | 'updated';

// Images downloaded at the same time.
const PARALLEL_DOWNLOADS = 4;

async function loadBundledLibrary(): Promise<SourceExercise[]> {
  const { default: source } = await import('../../data/free-exercise-db/exercises.json');
  return source as SourceExercise[];
}

export async function updateLibraryOnline(
  db: AppDatabase,
  download: LibraryDownload,
  {
    now = Date.now(),
    bundledCommit = libraryData.commit,
    bundledLibrary = loadBundledLibrary,
  }: { now?: number; bundledCommit?: string; bundledLibrary?: () => Promise<SourceExercise[]> } = {},
): Promise<LibraryUpdateResult> {
  if (!isCheckDue(await readAppState(db, 'libraryCheckedAt'), now)) {
    return 'not-due';
  }
  const head = await download.fetchHeadCommit();
  await writeAppState(db, 'libraryCheckedAt', String(now));
  const current = (await readAppState(db, 'onlineLibraryCommit')) || bundledCommit;
  if (head === current) {
    return 'current';
  }

  const next = parseLibrary(await download.fetchLibraryFile(head));
  const changed = await download.fetchChangedFiles(bundledCommit, head);
  const paths = imagesToDownload(await bundledLibrary(), next, changed);
  for (let i = 0; i < paths.length; i += PARALLEL_DOWNLOADS) {
    await Promise.all(
      paths.slice(i, i + PARALLEL_DOWNLOADS).map((path) => download.downloadImage(head, path, storedLibraryImage(path))),
    );
  }

  await seedLibrary(db, next, new Map(paths.map((path) => [path, storedLibraryImage(path)])));
  // Written last: if the app stops before, the next check does the update again.
  await writeAppState(db, 'onlineLibraryCommit', head);
  return 'updated';
}
