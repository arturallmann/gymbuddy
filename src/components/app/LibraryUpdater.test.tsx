import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { DatabaseContext } from '@/db/DatabaseContext';
import type { AppDatabase } from '@/db/driver';
import LibraryUpdater from './LibraryUpdater';

const update = vi.hoisted(() => vi.fn());
vi.mock('@/db/libraryUpdate', () => ({ updateLibraryOnline: update }));
vi.mock('@/native/libraryDownload', () => ({}));

const db = {} as AppDatabase;
const renderUpdater = () =>
  render(
    <DatabaseContext.Provider value={db}>
      <LibraryUpdater />
    </DatabaseContext.Provider>,
  );

beforeEach(() => {
  vi.useFakeTimers();
  update.mockReset().mockResolvedValue('current');
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('update the library a moment after the start when the phone is online', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  renderUpdater();
  expect(update).not.toHaveBeenCalled();

  await act(() => vi.advanceTimersByTimeAsync(5000));

  expect(update).toHaveBeenCalledWith(db, expect.anything());
});

test('do nothing offline', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  renderUpdater();

  await act(() => vi.advanceTimersByTimeAsync(5000));

  expect(update).not.toHaveBeenCalled();
});

test('keep the app running when the update fails', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  update.mockRejectedValue(new Error('offline'));
  renderUpdater();

  await act(() => vi.advanceTimersByTimeAsync(5000));

  expect(warn).toHaveBeenCalledWith('Library update failed', expect.any(Error));
});
