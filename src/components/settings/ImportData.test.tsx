import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { listExportRows } from '@/db/export';
import { workouts } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { toCsv } from '@/lib/csv';
import { EXPORT_HEADER } from '@/lib/exportTable';
import { createTestDatabase } from '@/testing/database';
import { addTestLibrary } from '@/testing/exercises';
import { renderWithDatabase } from '@/testing/render';
import ImportData from './ImportData';

const row = (values: Record<string, string | number>) => EXPORT_HEADER.map((column) => values[column] ?? null);

function csvFile(rows: (string | number | null)[][], name = 'gymbuddy.csv') {
  return new File([toCsv({ header: EXPORT_HEADER, rows })], name, { type: 'text/csv' });
}

const goodFile = () =>
  csvFile([
    row({ Date: '2026-10-01', 'Start time': '09:00', 'End time': '09:45', Exercise: 'Barbell Curl', Set: 1, 'Load type': 'Weight', Weight: 20, 'Weight unit': 'kg', Reps: 10 }),
    row({ Date: '2026-10-01', 'Start time': '09:00', 'End time': '09:45', Exercise: 'Barbell Curl', Set: 2, 'Load type': 'Weight', Weight: 20, 'Weight unit': 'kg', Reps: 8 }),
    row({ Date: '2026-10-01', 'Start time': '09:00', 'End time': '09:45', Exercise: 'Sled Push', Set: 1, 'Duration (s)': 30 }),
  ]);

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  await addTestLibrary(db);
  const rendered = await renderWithDatabase(<ImportData />, { db });
  return { ...rendered, userId };
}

describe('ImportData', () => {
  test('import a file and report workouts, sets and new custom exercises', async () => {
    const { db, user, userId } = await setup();

    await user.upload(screen.getByLabelText('Import CSV or Excel'), goodFile());

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Imported 1 workout with 3 sets. New custom exercises: Sled Push.',
    );
    expect((await listExportRows(db, userId)).map((r) => [r.exerciseName, r.reps, r.durationSeconds])).toEqual([
      ['Barbell Curl', 10, null],
      ['Barbell Curl', 8, null],
      ['Sled Push', null, 30],
    ]);
  });

  test('skip workouts that are already in the app when the same file comes again', async () => {
    const { db, user } = await setup();
    await user.upload(screen.getByLabelText('Import CSV or Excel'), goodFile());
    await screen.findByText(/Imported 1 workout/);

    await user.upload(screen.getByLabelText('Import CSV or Excel'), goodFile());

    expect(await screen.findByText(/Imported 0 workouts with 0 sets\. Skipped 1 workout that is already in the app\./)).toBeInTheDocument();
    expect(await db.select().from(workouts)).toHaveLength(1);
  });

  test('list the problems and import nothing when a row is wrong', async () => {
    const { db, user } = await setup();
    const file = csvFile(
      [
        row({ Date: '2026-10-01', 'Start time': '09:00', Exercise: 'Barbell Curl', Reps: 10 }),
        row({ Date: '2026-10-01', 'Start time': '09:00', Exercise: 'Barbell Curl', Reps: 'many' }),
      ],
      'broken.csv',
    );

    await user.upload(screen.getByLabelText('Import CSV or Excel'), file);

    expect(await screen.findByRole('status')).toHaveTextContent('Nothing was imported. Fix 1 problem in broken.csv and try again:');
    expect(screen.getByRole('listitem')).toHaveTextContent('Row 3: Reps must be a whole number, not "many".');
    expect(await db.select().from(workouts)).toEqual([]);
  });

  test('show at most ten problems', async () => {
    const { user } = await setup();
    const rows = Array.from({ length: 12 }, () => row({ Date: 'yesterday', 'Start time': '09:00', Exercise: 'Squat' }));

    await user.upload(screen.getByLabelText('Import CSV or Excel'), csvFile(rows));

    expect(await screen.findByText('and 2 more')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(11);
  });
});
