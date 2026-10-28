import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_FEATURES } from '@/db/schema';
import { PRESET_FEATURES } from '@/lib/features';
import { renderWithDatabase, savedSettings } from '@/testing/render';
import SetupPage from './page';

const replace = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

function useLanguage(language: string) {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(language);
}

beforeEach(() => {
  replace.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('first-time setup', () => {
  test('suggest units from the phone region', async () => {
    useLanguage('en-US');
    await renderWithDatabase(<SetupPage />);

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'lb' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Imperial (ft, mi)' })).toHaveAttribute('aria-checked', 'true');
  });

  test('save units and preset, then go to the home page', async () => {
    useLanguage('de-DE');
    const { db, user } = await renderWithDatabase(<SetupPage />);

    await user.click(screen.getByRole('radio', { name: 'lb' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Simple/ }));
    await user.click(screen.getByRole('button', { name: 'Finish' }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    const settings = await savedSettings(db);
    expect(settings).toMatchObject({
      weightUnit: 'lb',
      distanceUnit: 'metric',
      preset: 'simple',
      features: PRESET_FEATURES.simple,
    });
    expect(settings.setupCompletedAt).toBeInstanceOf(Date);
  });

  test('save fine-tuned toggles as a custom preset', async () => {
    useLanguage('de-DE');
    const { db, user } = await renderWithDatabase(<SetupPage />);

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Fine-tune features' }));
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'RPE' }));
    await user.click(screen.getByRole('button', { name: 'Finish' }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(await savedSettings(db)).toMatchObject({
      preset: 'custom',
      features: { ...DEFAULT_FEATURES, rpe: true },
    });
  });

  test('go back without losing choices', async () => {
    useLanguage('de-DE');
    const { user } = await renderWithDatabase(<SetupPage />);

    await user.click(screen.getByRole('radio', { name: 'lb' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('radio', { name: 'lb' })).toHaveAttribute('aria-checked', 'true');
  });

  test('save nothing before Finish', async () => {
    useLanguage('de-DE');
    const { db, user } = await renderWithDatabase(<SetupPage />);

    await user.click(screen.getByRole('radio', { name: 'lb' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await savedSettings(db)).toMatchObject({ weightUnit: 'kg', setupCompletedAt: null });
  });
});
