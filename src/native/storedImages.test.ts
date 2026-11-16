import { beforeEach, expect, test, vi } from 'vitest';

const plugin = vi.hoisted(() => ({ native: true, writeFile: vi.fn(), getUri: vi.fn(), readFile: vi.fn() }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => plugin.native, convertFileSrc: (uri: string) => `http://localhost/_capacitor_file_${uri.replace('file://', '')}` },
}));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Filesystem: { writeFile: plugin.writeFile, getUri: plugin.getUri, readFile: plugin.readFile },
}));

import { storedImageSrc, writeStoredImage } from './storedImages';

beforeEach(() => {
  plugin.native = true;
  plugin.writeFile.mockReset().mockResolvedValue({ uri: 'file:///x' });
  plugin.getUri.mockReset().mockResolvedValue({ uri: 'file:///data/files/exercise-photos/a.jpg' });
  plugin.readFile.mockReset().mockResolvedValue({ data: 'AAAA' });
});

test('write an image into the app data folder, creating its folder', async () => {
  await writeStoredImage('exercise-photos/a.jpg', 'AAAA');
  expect(plugin.writeFile).toHaveBeenCalledWith({ path: 'exercise-photos/a.jpg', data: 'AAAA', directory: 'DATA', recursive: true });
});

test('show a stored image through its file address on a phone', async () => {
  expect(await storedImageSrc('exercise-photos/a.jpg')).toBe('http://localhost/_capacitor_file_/data/files/exercise-photos/a.jpg');
});

test('show a stored image as a data address in the browser', async () => {
  plugin.native = false;
  expect(await storedImageSrc('exercise-photos/a.jpg')).toBe('data:image/jpeg;base64,AAAA');
});
