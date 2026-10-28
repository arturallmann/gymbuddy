'use client';

import ToggleRow from '@/components/ToggleRow';
import type { FeatureToggles } from '@/db/schema';
import { FEATURES } from '@/lib/features';

// One switch per feature toggle.
export default function FeatureToggleList({
  features,
  onChange,
}: {
  features: FeatureToggles;
  onChange: (features: FeatureToggles) => void;
}) {
  return (
    <div className="flex flex-col divide-y divide-gray-400/30">
      {FEATURES.map((feature) => (
        <ToggleRow
          key={feature.name}
          label={feature.label}
          description={feature.description}
          checked={features[feature.name]}
          onChange={(checked) => onChange({ ...features, [feature.name]: checked })}
        />
      ))}
    </div>
  );
}
