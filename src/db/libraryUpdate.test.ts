import { eq } from 'drizzle-orm';
import { describe, expect, test, vi } from 'vitest';
import { CHECK_INTERVAL_MS } from '@/lib/libraryUpdate';
import { createTestDatabase } from '@/testing/database';
import { readAppState, writeAppState } from './appState';
import { updateLibraryOnline, type LibraryDownload } from './libraryUpdate';
import { exerciseImages, exercises } from './schema';
import { seedLibrary, type SourceExercise } from './seed';

const BUNDLED = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const NOW = 1_800_000_000_000;

const exercise = (id: string, name = id.replace(/_/g, ' ')): SourceExercise => ({
  id,
  name,
  force: 'pull',
  level: 'beginner',
  mechanic: null,
  equipment: 'barbell',
  primaryMuscles: ['biceps'],
  secondaryMuscles: [],
  instructions: [],
  category: 'strength',
  images: [`${id}/0.jpg`],
});
// The bundled library: 120 exercises. The newer one renames Exercise_0 and adds Kettlebell_Halo.
const bundled = Array.from({ length: 120 }, (_, i) => exercise(`Exercise_${i}`));
const next = [exercise('Exercise_0', 'Better name'), ...bundled.slice(1), exercise('Kettlebell_Halo')];

function fakeDownload(overrides: Partial<LibraryDownload> = {}): LibraryDownload {
  return {
    fetchHeadCommit: vi.fn().mockResolvedValue(HEAD),
    fetchLibraryFile: vi.fn().mockResolvedValue(JSON.parse(JSON.stringify(next))),
    fetchChangedFiles: vi.fn().mockResolvedValue(['exercises/Exercise_1/0.jpg', 'dist/exercises.json']),
    downloadImage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

async function setup() {
  const { db } = await createTestDatabase();
  await seedLibrary(db, bundled);
  const run = (download: LibraryDownload, now = NOW) =>
    updateLibraryOnline(db, download, { now, bundledCommit: BUNDLED, bundledLibrary: async () => bundled });
  return { db, run };
}

async function storedFileOf(db: Awaited<ReturnType<typeof setup>>['db'], sourceId: string) {
  const [row] = await db
    .select({ name: exercises.name, storedFile: exerciseImages.storedFile })
    .from(exercises)
    .innerJoin(exerciseImages, eq(exerciseImages.exerciseId, exercises.id))
    .where(eq(exercises.sourceId, sourceId));
  return row;
}

describe('updateLibraryOnline', () => {
  test('update the library and download only new and changed images', async () => {
    const { db, run } = await setup();
    const download = fakeDownload();

    expect(await run(download)).toBe('updated');

    expect(download.fetchChangedFiles).toHaveBeenCalledWith(BUNDLED, HEAD);
    expect(vi.mocked(download.downloadImage).mock.calls).toEqual([
      [HEAD, 'Exercise_1/0.jpg', 'library-images/Exercise_1/0.jpg'],
      [HEAD, 'Kettlebell_Halo/0.jpg', 'library-images/Kettlebell_Halo/0.jpg'],
    ]);
    expect(await storedFileOf(db, 'Exercise_0')).toEqual({ name: 'Better name', storedFile: null });
    expect(await storedFileOf(db, 'Exercise_1')).toEqual({ name: 'Exercise 1', storedFile: 'library-images/Exercise_1/0.jpg' });
    expect(await storedFileOf(db, 'Kettlebell_Halo')).toEqual({ name: 'Kettlebell Halo', storedFile: 'library-images/Kettlebell_Halo/0.jpg' });
    expect(await readAppState(db, 'onlineLibraryCommit')).toBe(HEAD);
  });

  test('check at most once a day', async () => {
    const { run } = await setup();
    const download = fakeDownload();
    await run(download);

    expect(await run(download, NOW + 60_000)).toBe('not-due');
    expect(download.fetchHeadCommit).toHaveBeenCalledOnce();
  });

  test('do nothing more when the newest commit is already on the phone', async () => {
    const { run } = await setup();
    await run(fakeDownload());

    const again = fakeDownload();
    expect(await run(again, NOW + CHECK_INTERVAL_MS)).toBe('current');
    expect(again.fetchLibraryFile).not.toHaveBeenCalled();
  });

  test('do nothing when free-exercise-db has nothing newer than the bundled library', async () => {
    const { run } = await setup();
    const download = fakeDownload({ fetchHeadCommit: vi.fn().mockResolvedValue(BUNDLED) });

    expect(await run(download)).toBe('current');
    expect(download.fetchLibraryFile).not.toHaveBeenCalled();
  });

  test('leave the library as it was when a download fails or the file is broken', async () => {
    for (const download of [
      fakeDownload({ downloadImage: vi.fn().mockRejectedValue(new Error('offline')) }),
      fakeDownload({ fetchLibraryFile: vi.fn().mockResolvedValue({ broken: true }) }),
    ]) {
      const { db, run } = await setup();

      await expect(run(download)).rejects.toThrow();

      expect(await storedFileOf(db, 'Exercise_0')).toEqual({ name: 'Exercise 0', storedFile: null });
      expect(await readAppState(db, 'onlineLibraryCommit')).toBeNull();
    }
  });

  test('apply the online update again after a new bundled library replaced it', async () => {
    const { db, run } = await setup();
    await run(fakeDownload());
    await writeAppState(db, 'onlineLibraryCommit', '');
    await writeAppState(db, 'libraryCheckedAt', '');

    expect(await run(fakeDownload(), NOW + 1)).toBe('updated');
  });
});
