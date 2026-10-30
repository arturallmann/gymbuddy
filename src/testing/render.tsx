// Test helpers for components: render with a real in-memory database and the
// same providers the app uses.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import SettingsProvider from '@/components/SettingsProvider';
import { DatabaseContext } from '@/db/DatabaseContext';
import type { AppDatabase } from '@/db/driver';
import { getLocalSettings, updateSettings, type SettingsChange } from '@/db/settings';
import { createTestDatabase } from './database';

type Options = {
  // Settings to save before rendering, such as { setupCompletedAt: new Date() }.
  settings?: SettingsChange;
  // A database from createTestDatabase() with rows written before rendering.
  db?: AppDatabase;
};

// Renders `ui` inside DatabaseProvider's context and SettingsProvider, and
// waits until the settings have loaded.
export async function renderWithDatabase(ui: ReactNode, options: Options = {}) {
  const db = options.db ?? (await createTestDatabase()).db;
  if (options.settings) {
    const settings = await getLocalSettings(db);
    await updateSettings(db, settings.id, options.settings);
  }
  const user = userEvent.setup();
  const result = render(<Providers db={db}>{ui}</Providers>);
  await screen.findByTestId('settings-loaded');
  return { ...result, db, user };
}

function Providers({ db, children }: { db: AppDatabase; children: ReactNode }) {
  return (
    <DatabaseContext.Provider value={db}>
      <SettingsProvider>
        <span data-testid="settings-loaded" hidden />
        {children}
      </SettingsProvider>
    </DatabaseContext.Provider>
  );
}

// Reads the saved settings, to check what a component wrote.
export function savedSettings(db: AppDatabase) {
  return getLocalSettings(db);
}
