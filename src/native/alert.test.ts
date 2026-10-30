// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from 'vitest';

const plugin = vi.hoisted(() => ({ native: true, vibrate: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => plugin.native } }));
vi.mock('@capacitor/haptics', () => ({ Haptics: { vibrate: plugin.vibrate } }));

import { signalTimerDone, vibrate } from './alert';

beforeEach(() => {
  plugin.native = true;
  plugin.vibrate.mockReset().mockResolvedValue(undefined);
});

test('vibrate through the Haptics plugin on the phone', async () => {
  await vibrate();
  expect(plugin.vibrate).toHaveBeenCalledWith({ duration: 600 });
});

test('vibrate through the browser outside the phone', async () => {
  plugin.native = false;
  const browserVibrate = vi.fn();
  Object.defineProperty(navigator, 'vibrate', { value: browserVibrate, configurable: true });

  await vibrate();

  expect(browserVibrate).toHaveBeenCalledWith(600);
  expect(plugin.vibrate).not.toHaveBeenCalled();
});

test('never throw when the signal fails', async () => {
  plugin.vibrate.mockRejectedValue(new Error('No vibrator'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  await expect(signalTimerDone()).resolves.toBeUndefined();
});
