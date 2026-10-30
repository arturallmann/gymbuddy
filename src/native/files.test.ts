// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest';

const plugin = vi.hoisted(() => ({ native: true, writeFile: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => plugin.native } }));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: { writeFile: plugin.writeFile },
}));

import { saveFile, toBase64 } from './files';

beforeEach(() => {
  plugin.native = true;
  plugin.writeFile.mockReset().mockResolvedValue({ uri: 'file:///cache/export' });
});

describe('saveFile', () => {
  test('write text as UTF-8 to the cache folder on the phone', async () => {
    expect(await saveFile('gymbuddy.csv', 'a,b', 'text/csv')).toBe('file:///cache/export');
    expect(plugin.writeFile).toHaveBeenCalledWith({ path: 'gymbuddy.csv', data: 'a,b', directory: 'CACHE', encoding: 'utf8' });
  });

  test('write binary data as base64 on the phone', async () => {
    await saveFile('gymbuddy.xlsx', new Uint8Array([80, 75, 3, 4]), 'application/zip');
    expect(plugin.writeFile).toHaveBeenCalledWith({ path: 'gymbuddy.xlsx', data: 'UEsDBA==', directory: 'CACHE' });
  });

  test('download the file in the browser instead', async () => {
    plugin.native = false;
    URL.createObjectURL = vi.fn(() => 'blob:export');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    expect(await saveFile('gymbuddy.csv', 'a,b', 'text/csv')).toBeNull();
    expect(click).toHaveBeenCalled();
    expect(plugin.writeFile).not.toHaveBeenCalled();
  });
});

test('encode large data in chunks', () => {
  const bytes = new Uint8Array(100_000).fill(65);
  expect(atob(toBase64(bytes))).toBe('A'.repeat(100_000));
});
