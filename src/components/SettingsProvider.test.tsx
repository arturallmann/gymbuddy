import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { DatabaseContext } from '@/db/DatabaseContext';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase, savedSettings } from '@/testing/render';
import SettingsProvider from './SettingsProvider';

function ShowSettings() {
  const { settings, updateSettings } = useSettings();
  const features = useFeatures();
  return (
    <div>
      <p>Weight unit: {settings.weightUnit}</p>
      <p>RPE: {features.rpe ? 'on' : 'off'}</p>
      <button onClick={() => updateSettings({ weightUnit: 'lb', features: { rpe: true } })}>Change</button>
    </div>
  );
}

describe('SettingsProvider', () => {
  test('load the default settings and create the local user', async () => {
    const { db } = await renderWithDatabase(<ShowSettings />);

    expect(screen.getByText('Weight unit: kg')).toBeInTheDocument();
    expect(screen.getByText('RPE: off')).toBeInTheDocument();
    expect((await savedSettings(db)).weightUnit).toBe('kg');
  });

  test('save changes and show them', async () => {
    const { db, user } = await renderWithDatabase(<ShowSettings />);

    await user.click(screen.getByRole('button', { name: 'Change' }));

    expect(await screen.findByText('Weight unit: lb')).toBeInTheDocument();
    expect(screen.getByText('RPE: on')).toBeInTheDocument();
    expect(await savedSettings(db)).toMatchObject({ weightUnit: 'lb', features: { rpe: true } });
  });

  test('show an error when the settings cannot load', async () => {
    const { db, conn } = await createTestDatabase();
    await conn.run('DROP TABLE user_settings');
    render(
      <DatabaseContext.Provider value={db}>
        <SettingsProvider>
          <ShowSettings />
        </SettingsProvider>
      </DatabaseContext.Provider>,
    );

    expect(await screen.findByText('The settings could not load.')).toBeInTheDocument();
  });
});

describe('useSettings', () => {
  test('fail outside SettingsProvider', () => {
    expect(() => render(<ShowSettings />)).toThrow('inside <SettingsProvider>');
  });
});
