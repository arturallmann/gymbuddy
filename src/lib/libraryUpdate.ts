// Pure rules of the online library update (decision 038). The network calls live in
// src/native/libraryDownload.ts; the steps in src/db/libraryUpdate.ts.
import type { SourceExercise } from '@/db/seed';

// How often the app asks free-exercise-db for a newer commit.
export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Every library image path looks like "3_4_Sit-Up/0.jpg". Anything else is refused, so a downloaded
// file can never land outside the image folder (no "..", no "/" at the start).
const IMAGE_PATH = /^[A-Za-z0-9_-]+\/\d+\.jpg$/;

// The library on a phone is never smaller than this; a much smaller file is broken.
const MIN_EXERCISES = 100;

// Where a downloaded library image is stored in the app's data folder.
export function storedLibraryImage(path: string): string {
  return `library-images/${path}`;
}

// True when no check ran yet or the last one is older than the check interval.
export function isCheckDue(lastCheckedAt: string | null, now: number): boolean {
  const last = Number(lastCheckedAt);
  return !lastCheckedAt || !Number.isFinite(last) || now - last >= CHECK_INTERVAL_MS || now < last;
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);

// Checks a downloaded exercises.json with the same shape the bundled one has. Throws when anything
// is off, so a broken or unexpected file never reaches the database.
export function parseLibrary(json: unknown): SourceExercise[] {
  if (!Array.isArray(json) || json.length < MIN_EXERCISES) {
    throw new Error('The library file is not a list of exercises');
  }
  const ids = new Set<string>();
  for (const [index, item] of json.entries()) {
    const exercise = item as Partial<Record<keyof SourceExercise, unknown>>;
    const ok =
      typeof item === 'object' &&
      item !== null &&
      isString(exercise.id) &&
      isString(exercise.name) &&
      exercise.name.trim() !== '' &&
      isString(exercise.category) &&
      isString(exercise.level) &&
      (exercise.force === null || isString(exercise.force)) &&
      (exercise.mechanic === null || isString(exercise.mechanic)) &&
      (exercise.equipment === null || isString(exercise.equipment)) &&
      isStringList(exercise.primaryMuscles) &&
      isStringList(exercise.secondaryMuscles) &&
      isStringList(exercise.instructions) &&
      isStringList(exercise.images) &&
      exercise.images.every((path) => IMAGE_PATH.test(path));
    if (!ok) {
      throw new Error(`Exercise ${index + 1} in the library file is not valid`);
    }
    if (ids.has(exercise.id as string)) {
      throw new Error(`Exercise ${String(exercise.id)} is in the library file twice`);
    }
    ids.add(exercise.id as string);
  }
  return json as SourceExercise[];
}

// The images to download for a new library: the ones the app does not bundle, and the ones
// free-exercise-db changed since the bundled commit. `changedFiles` holds repository paths such as
// "exercises/Barbell_Curl/0.jpg", or null when the list of changes is unknown.
export function imagesToDownload(bundled: SourceExercise[], next: SourceExercise[], changedFiles: string[] | null): string[] {
  const bundledPaths = new Set(bundled.flatMap((exercise) => exercise.images));
  const changed = new Set((changedFiles ?? []).map((file) => file.replace(/^exercises\//, '')));
  const paths = next.flatMap((exercise) => exercise.images);
  return [...new Set(paths.filter((path) => !bundledPaths.has(path) || changed.has(path)))].sort();
}
