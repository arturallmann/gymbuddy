import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useDatabase } from '@/db/DatabaseContext';
import type { AppDatabase } from '@/db/driver';
import DatabaseProvider from './DatabaseProvider';

const getDatabase = vi.hoisted(() => vi.fn<() => Promise<AppDatabase>>());
vi.mock('@/db/client', () => ({ getDatabase }));

function ShowDatabase() {
  useDatabase();
  return <p>Database ready</p>;
}

beforeEach(() => {
  getDatabase.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

test('show loading until the database is open, then the page', async () => {
  let open: (db: AppDatabase) => void = () => {};
  getDatabase.mockReturnValue(new Promise((resolve) => (open = resolve)));
  render(
    <DatabaseProvider>
      <ShowDatabase />
    </DatabaseProvider>,
  );

  expect(screen.getByText('Loading…')).toBeInTheDocument();
  open({} as AppDatabase);
  expect(await screen.findByText('Database ready')).toBeInTheDocument();
});

test('show the error when the database cannot open', async () => {
  getDatabase.mockRejectedValue(new Error('disk full'));
  render(
    <DatabaseProvider>
      <ShowDatabase />
    </DatabaseProvider>,
  );

  expect(await screen.findByText('The database could not open.')).toBeInTheDocument();
  expect(screen.getByText('disk full')).toBeInTheDocument();
});

test('useDatabase fails outside DatabaseProvider', () => {
  expect(() => render(<ShowDatabase />)).toThrow('inside <DatabaseProvider>');
});
