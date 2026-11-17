'use client';

import OptionGroup from '@/components/ui/OptionGroup';
import type { Theme } from '@/db/schema';
import { useSettings } from '@/hooks/useSettings';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Same as phone' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// Theme choice on the settings page (decision 030). SettingsProvider shows the chosen theme.
export default function ThemeSettings() {
  const { settings, updateSettings } = useSettings();
  return (
    <OptionGroup
      label="Theme"
      hideLabel
      options={THEME_OPTIONS}
      value={settings.theme}
      onChange={(theme) => void updateSettings({ theme })}
    />
  );
}
