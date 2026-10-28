'use client';

import FeatureToggleList from '@/components/FeatureToggleList';
import OptionGroup from '@/components/OptionGroup';
import type { Preset } from '@/db/schema';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { PRESET_FEATURES, PRESET_LABELS } from '@/lib/features';

const PRESET_OPTIONS = (['simple', 'standard', 'advanced'] as const).map((value) => ({
  value,
  label: PRESET_LABELS[value],
}));

// Preset choice and feature toggles on the settings page. Toggles hide interface only.
export default function FeatureSettings() {
  const { settings, updateSettings } = useSettings();
  const features = useFeatures();

  return (
    <div className="flex flex-col gap-4">
      <OptionGroup<Preset>
        label={settings.preset === 'custom' ? 'Preset (now: Custom)' : 'Preset'}
        options={PRESET_OPTIONS}
        value={settings.preset}
        onChange={(preset) =>
          preset !== 'custom' && updateSettings({ preset, features: PRESET_FEATURES[preset] })
        }
      />
      <FeatureToggleList
        features={features}
        onChange={(changed) => updateSettings({ preset: 'custom', features: changed })}
      />
    </div>
  );
}
