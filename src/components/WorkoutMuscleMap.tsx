'use client';

import { useState } from 'react';
import { useBackHandler } from '@/hooks/useBackHandler';
import { formatSetCount, type MuscleGroupSummary } from '@/lib/statistics';
import MuscleGroupCard from './MuscleGroupCard';
import MuscleMap from './MuscleMap';

// The muscle map of one workout (decision 046): each muscle group shaded by its sets in the workout.
export default function WorkoutMuscleMap({ muscleGroups }: { muscleGroups: MuscleGroupSummary[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  useBackHandler(selected ? () => setSelected(null) : null);
  return (
    <section aria-label="Muscle map" className="flex flex-col gap-3">
      <MuscleMap
        values={new Map(muscleGroups.map((group) => [group.key, group.primarySets + group.secondarySets]))}
        names={new Map(muscleGroups.map((group) => [group.key, group.name]))}
        format={formatSetCount}
        selected={selected}
        onSelect={setSelected}
      />
      <MuscleGroupCard
        muscleGroup={selected}
        summary={muscleGroups.find((group) => group.key === selected)}
        weeks={1}
        emptyText="No sets in this workout."
      />
    </section>
  );
}
