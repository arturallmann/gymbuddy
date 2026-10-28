'use client';

import { createContext, useContext } from 'react';
import type { FeatureToggles, UserSettings } from '@/db/schema';
import type { SettingsChange } from '@/db/settings';
import { resolveFeatures } from '@/lib/features';

export type SettingsContextValue = {
  settings: UserSettings;
  updateSettings: (change: SettingsChange) => Promise<void>;
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);

// The settings of the local user. Only works inside <SettingsProvider>.
export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error('useSettings must be used inside <SettingsProvider>');
  }
  return value;
}

// The feature toggles. Every optional feature checks its toggle here.
export function useFeatures(): FeatureToggles {
  return resolveFeatures(useSettings().settings.features);
}
