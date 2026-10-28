'use client';

import OptionGroup from '@/components/OptionGroup';
import type { DistanceUnit, WeightUnit } from '@/db/schema';
import type { Units } from '@/lib/units';

const WEIGHT_OPTIONS: { value: WeightUnit; label: string }[] = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
];

const DISTANCE_OPTIONS: { value: DistanceUnit; label: string }[] = [
  { value: 'metric', label: 'Metric (m, km)' },
  { value: 'imperial', label: 'Imperial (ft, mi)' },
];

// Weight unit and distance unit choice.
export default function UnitPicker({
  units,
  onChange,
}: {
  units: Units;
  onChange: (change: Partial<Units>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <OptionGroup
        label="Weight unit"
        options={WEIGHT_OPTIONS}
        value={units.weightUnit}
        onChange={(weightUnit) => onChange({ weightUnit })}
      />
      <OptionGroup
        label="Distance unit"
        options={DISTANCE_OPTIONS}
        value={units.distanceUnit}
        onChange={(distanceUnit) => onChange({ distanceUnit })}
      />
    </div>
  );
}
