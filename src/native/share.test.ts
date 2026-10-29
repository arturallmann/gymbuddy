import { beforeEach, expect, test, vi } from 'vitest';

const plugin = vi.hoisted(() => ({ share: vi.fn() }));
vi.mock('@capacitor/share', () => ({ Share: { share: plugin.share } }));

import { shareFile } from './share';

beforeEach(() => {
  plugin.share.mockReset().mockResolvedValue({});
});

test('open the share menu with the file', async () => {
  await shareFile('file:///cache/gymbuddy.csv', 'Gymbuddy export');
  expect(plugin.share).toHaveBeenCalledWith({ title: 'Gymbuddy export', files: ['file:///cache/gymbuddy.csv'] });
});

test('treat a closed share menu as no error, but pass on other errors', async () => {
  plugin.share.mockRejectedValueOnce(new Error('Share canceled'));
  await expect(shareFile('file:///x', 'x')).resolves.toBeUndefined();

  plugin.share.mockRejectedValueOnce(new Error('No app can share this'));
  await expect(shareFile('file:///x', 'x')).rejects.toThrow('No app');
});
