import { describe, expect, test } from 'vitest';
import type { SourceExercise } from '@/db/seed';
import { CHECK_INTERVAL_MS, imagesToDownload, isCheckDue, parseLibrary, storedLibraryImage } from './libraryUpdate';

const exercise = (id: string, images: string[] = [`${id}/0.jpg`]): SourceExercise => ({
  id,
  name: id.replace(/_/g, ' '),
  force: 'pull',
  level: 'beginner',
  mechanic: null,
  equipment: 'barbell',
  primaryMuscles: ['biceps'],
  secondaryMuscles: [],
  instructions: ['Curl the bar.'],
  category: 'strength',
  images,
});
const many = (count: number) => Array.from({ length: count }, (_, i) => exercise(`Exercise_${i}`));

describe('parseLibrary', () => {
  test('accept a list shaped like the bundled library', () => {
    const list = many(120);
    expect(parseLibrary(JSON.parse(JSON.stringify(list)))).toEqual(list);
  });

  test('refuse something that is not a library', () => {
    expect(() => parseLibrary({ exercises: [] })).toThrow('not a list');
    expect(() => parseLibrary(many(10))).toThrow('not a list');
  });

  test('refuse a broken exercise, a duplicate id and image paths outside the image folder', () => {
    const broken = many(120);
    broken[5] = { ...broken[5], images: 'x' as unknown as string[] };
    expect(() => parseLibrary(broken)).toThrow('Exercise 6');

    for (const path of ['../secret/0.jpg', '/etc/0.jpg', 'Curl/0.png', 'Curl/x/0.jpg']) {
      const list = many(120);
      list[0] = exercise('Curl', [path]);
      expect(() => parseLibrary(list)).toThrow('Exercise 1');
    }

    const twice = many(120);
    twice[1] = twice[0];
    expect(() => parseLibrary(twice)).toThrow('twice');
  });
});

describe('imagesToDownload', () => {
  const bundled = [exercise('Curl', ['Curl/0.jpg', 'Curl/1.jpg']), exercise('Row')];

  test('download images the app does not bundle and images free-exercise-db changed', () => {
    const next = [exercise('Curl', ['Curl/0.jpg', 'Curl/1.jpg']), exercise('Row'), exercise('Halo', ['Halo/0.jpg'])];
    const changed = ['exercises/Curl/1.jpg', 'README.md', 'exercises/Gone/0.jpg'];

    expect(imagesToDownload(bundled, next, changed)).toEqual(['Curl/1.jpg', 'Halo/0.jpg']);
  });

  test('download only images the app does not bundle when the changes are unknown', () => {
    const next = [...bundled, exercise('Halo')];
    expect(imagesToDownload(bundled, next, null)).toEqual(['Halo/0.jpg']);
  });
});

describe('isCheckDue', () => {
  const now = 1_000_000_000_000;

  test('check when it never ran or ran a day ago, but not twice a day', () => {
    expect(isCheckDue(null, now)).toBe(true);
    expect(isCheckDue('', now)).toBe(true);
    expect(isCheckDue(String(now - CHECK_INTERVAL_MS), now)).toBe(true);
    expect(isCheckDue(String(now - 60_000), now)).toBe(false);
  });

  test('check again when the phone clock went back or the value is broken', () => {
    expect(isCheckDue(String(now + 60_000), now)).toBe(true);
    expect(isCheckDue('soon', now)).toBe(true);
  });
});

test('store downloaded images in their own folder', () => {
  expect(storedLibraryImage('Curl/0.jpg')).toBe('library-images/Curl/0.jpg');
});
