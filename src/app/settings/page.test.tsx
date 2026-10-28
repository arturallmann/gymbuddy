import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { DEFAULT_FEATURES } from '@/db/schema';
import { PRESET_FEATURES } from '@/lib/features';
import { renderWithDatabase, savedSettings } from '@/testing/render';
import SettingsPage from './page';

const done = { settings: { setupCompletedAt: new Date() } };

describe('settings page', () => {
  test('save a unit change', async () => {
    const { db, user } = await renderWithDatabase(<SettingsPage />, done);

    await user.click(screen.getByRole('radio', { name: 'lb' }));
    await user.click(screen.getByRole('radio', { name: 'Imperial (ft, mi)' }));

    expect(await screen.findByRole('radio', { name: 'lb', checked: true })).toBeInTheDocument();
    expect(await savedSettings(db)).toMatchObject({ weightUnit: 'lb', distanceUnit: 'imperial' });
  });

  test('switch the preset to custom when a toggle changes', async () => {
    const { db, user } = await renderWithDatabase(<SettingsPage />, done);

    await user.click(screen.getByRole('switch', { name: 'RPE' }));

    expect(await screen.findByRole('switch', { name: 'RPE', checked: true })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Preset (now: Custom)' })).toBeInTheDocument();
    expect(await savedSettings(db)).toMatchObject({
      preset: 'custom',
      features: { ...DEFAULT_FEATURES, rpe: true },
    });
  });

  test('replace all toggles when a preset is chosen', async () => {
    const { db, user } = await renderWithDatabase(<SettingsPage />, {
      settings: { setupCompletedAt: new Date(), preset: 'custom', features: { rpe: true } },
    });

    const presets = screen.getByRole('radiogroup', { name: /Preset/ });
    await user.click(within(presets).getByRole('radio', { name: 'Simple' }));

    expect(await screen.findByRole('switch', { name: 'Rest timer', checked: false })).toBeInTheDocument();
    expect(await savedSettings(db)).toMatchObject({ preset: 'simple', features: PRESET_FEATURES.simple });
  });
});
