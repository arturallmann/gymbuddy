import { beforeEach, expect, test, vi } from 'vitest';

const plugin = vi.hoisted(() => ({ native: true, remove: vi.fn(), addListener: vi.fn(), exitApp: vi.fn() }));
vi.mock('@capacitor/app', () => ({ App: { addListener: plugin.addListener, exitApp: plugin.exitApp } }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => plugin.native } }));

import { exitApp, onBackButton } from './app';

beforeEach(() => {
  plugin.native = true;
  plugin.remove.mockReset();
  plugin.exitApp.mockReset().mockResolvedValue(undefined);
  plugin.addListener.mockReset().mockResolvedValue({ remove: plugin.remove });
});

test('listen to the Back button on a phone, and stop again', async () => {
  const listener = vi.fn();
  const stop = onBackButton(listener);
  expect(plugin.addListener).toHaveBeenCalledWith('backButton', listener);

  stop();
  await vi.waitFor(() => expect(plugin.remove).toHaveBeenCalledOnce());
});

test('close the app on a phone', () => {
  exitApp();
  expect(plugin.exitApp).toHaveBeenCalledOnce();
});

test('do nothing in the browser', () => {
  plugin.native = false;
  onBackButton(vi.fn())();
  exitApp();
  expect(plugin.addListener).not.toHaveBeenCalled();
  expect(plugin.exitApp).not.toHaveBeenCalled();
});
