'use client';

import OptionGroup from '@/components/OptionGroup';
import type { DistanceUnit, WeightUnit } from '@/db/schema';
import { useSettings } from '@/hooks/useSettings';

const WEIGHT_OPTIONS: { value: WeightUnit; label: string }[] = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
];

const DISTANCE_OPTIONS: { value: DistanceUnit; label: string }[] = [
  { value: 'metric', label: 'Metric (m, km)' },
  { value: 'imperial', label: 'Imperial (ft, mi)' },
];

// Weight unit and distance unit. Changing them never changes stored data.
export default function UnitSettings() {
  const { settings, updateSettings } = useSettings();
  return (
    <div className="flex flex-col gap-4">
      <OptionGroup
        label="Weight unit"
        options={WEIGHT_OPTIONS}
        value={settings.weightUnit}
        onChange={(weightUnit) => updateSettings({ weightUnit })}
      />
      <OptionGroup
        label="Distance unit"
        options={DISTANCE_OPTIONS}
        value={settings.distanceUnit}
        onChange={(distanceUnit) => updateSettings({ distanceUnit })}
      />
    </div>
  );
}
