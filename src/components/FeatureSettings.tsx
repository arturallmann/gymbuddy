'use client';

import OptionGroup from '@/components/OptionGroup';
import ToggleRow from '@/components/ToggleRow';
import type { Preset } from '@/db/schema';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { FEATURES, PRESET_FEATURES, PRESET_LABELS } from '@/lib/features';

const PRESET_OPTIONS = (['simple', 'standard', 'advanced'] as const).map((value) => ({
  value,
  label: PRESET_LABELS[value],
}));

// Preset choice and one switch per feature toggle. Toggles hide interface only.
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
      <div className="flex flex-col divide-y divide-gray-400/30">
        {FEATURES.map((feature) => (
          <ToggleRow
            key={feature.name}
            label={feature.label}
            description={feature.description}
            checked={features[feature.name]}
            onChange={(checked) =>
              updateSettings({ preset: 'custom', features: { ...features, [feature.name]: checked } })
            }
          />
        ))}
      </div>
    </div>
  );
}
