'use client';

import { useBodyweights } from '@/hooks/useBodyweights';
import BodyweightForm from './BodyweightForm';
import HeightForm from './HeightForm';

// Height and bodyweight on the settings page (decision 043).
export default function BodySettings() {
  const { bodyweights, add } = useBodyweights();
  return (
    <div className="flex flex-col gap-6">
      <HeightForm />
      {bodyweights && <BodyweightForm current={bodyweights.at(-1) ?? null} onSave={add} />}
    </div>
  );
}
