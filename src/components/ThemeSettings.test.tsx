import { screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { renderWithDatabase, savedSettings } from '@/testing/render';
import ThemeSettings from './ThemeSettings';

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

describe('ThemeSettings', () => {
  test('start with the same theme as the phone', async () => {
    await renderWithDatabase(<ThemeSettings />);

    expect(screen.getByRole('radio', { name: 'Same as phone' })).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  test('choose dark: save it and show the dark theme', async () => {
    const { db, user } = await renderWithDatabase(<ThemeSettings />);

    await user.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(await screen.findByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect((await savedSettings(db)).theme).toBe('dark');
  });

  test('show a saved theme at start, and go back to the phone theme', async () => {
    const { db, user } = await renderWithDatabase(<ThemeSettings />, { settings: { theme: 'light' } });
    expect(document.documentElement.dataset.theme).toBe('light');

    await user.click(screen.getByRole('radio', { name: 'Same as phone' }));

    expect(await screen.findByRole('radio', { name: 'Same as phone' })).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect((await savedSettings(db)).theme).toBe('system');
  });
});
