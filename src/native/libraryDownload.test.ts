// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const stored = vi.hoisted(() => ({ write: vi.fn() }));
vi.mock('./storedImages', () => ({ writeStoredImage: stored.write, blobToBase64: async () => 'IMAGE' }));

import { downloadImage, fetchChangedFiles, fetchHeadCommit, fetchLibraryFile } from './libraryDownload';

const COMMIT = 'c'.repeat(40);
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  stored.write.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

test('ask GitHub for the newest commit, and refuse anything that is not one', async () => {
  fetchMock.mockResolvedValueOnce(new Response(`${COMMIT}\n`));
  expect(await fetchHeadCommit()).toBe(COMMIT);
  expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/yuhonas/free-exercise-db/commits/HEAD');

  fetchMock.mockResolvedValueOnce(new Response('<html>'));
  await expect(fetchHeadCommit()).rejects.toThrow('no commit');
});

test('download the library file of a commit, and fail on an error status', async () => {
  fetchMock.mockResolvedValueOnce(new Response('[1]'));
  expect(await fetchLibraryFile(COMMIT)).toEqual([1]);
  expect(fetchMock.mock.calls[0][0]).toBe(`https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}/dist/exercises.json`);

  fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
  await expect(fetchLibraryFile(COMMIT)).rejects.toThrow('404');
});

test('list changed files, without removed ones; unknown when the list is cut off or fails', async () => {
  const files = [
    { filename: 'exercises/Curl/0.jpg', status: 'modified' },
    { filename: 'exercises/Gone/0.jpg', status: 'removed' },
  ];
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ files })));
  expect(await fetchChangedFiles('a', 'b')).toEqual(['exercises/Curl/0.jpg']);

  const many = Array.from({ length: 300 }, (_, i) => ({ filename: `f${i}`, status: 'added' }));
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ files: many })));
  expect(await fetchChangedFiles('a', 'b')).toBeNull();

  fetchMock.mockRejectedValueOnce(new Error('offline'));
  expect(await fetchChangedFiles('a', 'b')).toBeNull();
});

test('download an image of a commit into the app storage', async () => {
  fetchMock.mockResolvedValueOnce(new Response(new Blob(['jpg'])));

  await downloadImage(COMMIT, 'Curl/0.jpg', 'library-images/Curl/0.jpg');

  expect(fetchMock.mock.calls[0][0]).toBe(`https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}/exercises/Curl/0.jpg`);
  expect(stored.write).toHaveBeenCalledWith('library-images/Curl/0.jpg', 'IMAGE');
});
