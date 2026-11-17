import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { saveExercisePreferences } from '@/db/preferences';
import { getLocalSettings } from '@/db/settings';
import { addSet, addWorkoutExercise, endWorkout, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import ExportData from './ExportData';

const native = vi.hoisted(() => ({ saveFile: vi.fn(), shareFile: vi.fn() }));
vi.mock('@/native/files', () => ({ saveFile: native.saveFile }));
vi.mock('@/native/share', () => ({ shareFile: native.shareFile }));

beforeEach(() => {
  native.saveFile.mockReset().mockResolvedValue('file:///cache/export');
  native.shareFile.mockReset().mockResolvedValue(undefined);
});

const values = { setType: 'normal' as const, weightGrams: 20412, reps: 5, durationSeconds: null, distanceMeters: null, rpe: null, notes: null };

async function withSets() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const library = await addTestLibrary(db);
  await saveExercisePreferences(db, userId, library.curl, { weightUnit: 'lb' });
  const workout = await startWorkout(db, userId);
  await addSet(db, await addWorkoutExercise(db, workout.id, library.curl), values);
  await addSet(db, await addWorkoutExercise(db, workout.id, library.press), values);
  await endWorkout(db, workout.id);
  return db;
}

describe('ExportData', () => {
  test('export every set as CSV in each exercise’s unit and open the share menu', async () => {
    const db = await withSets();
    const { user } = await renderWithDatabase(<ExportData />, { db });

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/Exported 2 sets to gymbuddy-\d{4}-\d{2}-\d{2}\.csv\./);
    const [name, data, mimeType] = native.saveFile.mock.calls[0];
    expect(name).toMatch(/\.csv$/);
    expect(mimeType).toBe('text/csv');
    const lines = (data as string).trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toMatch(/^\uFEFF?\d{4}-\d{2}-\d{2},\d{2}:\d{2},\d{2}:\d{2},Barbell Curl,Main phase,,1,Normal set,Weight,45,lb,5/);
    expect(lines[2]).toContain('Bench Press,Main phase,,1,Normal set,Weight,20.4,kg,5');
    expect(native.shareFile).toHaveBeenCalledWith('file:///cache/export', 'Gymbuddy export');
  });

  test('export every set as an Excel file', async () => {
    const db = await withSets();
    const { user } = await renderWithDatabase(<ExportData />, { db });

    await user.click(screen.getByRole('button', { name: 'Export Excel' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/Exported 2 sets to gymbuddy-.*\.xlsx\./);
    const [name, data, mimeType] = native.saveFile.mock.calls[0];
    expect(name).toMatch(/\.xlsx$/);
    expect(data).toBeInstanceOf(Uint8Array);
    expect(mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(native.shareFile).toHaveBeenCalled();
  });

  test('skip the share menu in the browser, where the file downloads', async () => {
    const db = await withSets();
    native.saveFile.mockResolvedValue(null);
    const { user } = await renderWithDatabase(<ExportData />, { db });

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Exported 2 sets');
    expect(native.shareFile).not.toHaveBeenCalled();
  });

  test('say so when there is nothing to export', async () => {
    const { user } = await renderWithDatabase(<ExportData />);

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(await screen.findByRole('status')).toHaveTextContent('No sets to export yet.');
    expect(native.saveFile).not.toHaveBeenCalled();
  });

  test('show an error when saving fails', async () => {
    const db = await withSets();
    native.saveFile.mockRejectedValue(new Error('Disk full'));
    const { user } = await renderWithDatabase(<ExportData />, { db });

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(await screen.findByRole('status')).toHaveTextContent('The export failed: Disk full');
  });
});
