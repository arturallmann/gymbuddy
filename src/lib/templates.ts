// Display helpers for templates. Pure functions: no database, no React.
import type { LoadType, TemplateExercise } from '@/db/schema';
import { formatSet, type SetValues } from './sets';
import type { Units } from './units';

export type Targets = Pick<
  TemplateExercise,
  'targetSets' | 'targetReps' | 'targetWeightGrams' | 'targetDurationSeconds' | 'targetDistanceMeters'
>;

// "2 × 22.5 kg × 8", "1:00", or "" without targets.
export function formatTargets(targets: Targets, loadType: LoadType, units: Units): string {
  const set = formatSet(
    {
      setType: 'normal',
      weightGrams: targets.targetWeightGrams,
      reps: targets.targetReps,
      durationSeconds: targets.targetDurationSeconds,
      distanceMeters: targets.targetDistanceMeters,
      rpe: null,
      notes: null,
    },
    loadType,
    units,
  );
  const hasValues =
    targets.targetReps !== null ||
    targets.targetWeightGrams !== null ||
    targets.targetDurationSeconds !== null ||
    targets.targetDistanceMeters !== null;
  if (!hasValues) return targets.targetSets ? `${targets.targetSets} sets` : '';
  return targets.targetSets && targets.targetSets > 1 ? `${targets.targetSets} × ${set}` : set;
}

// The name a new saved superset gets until the user changes it: "Curl + Press".
export function defaultSupersetName(names: string[]): string {
  return names.join(' + ');
}

// Targets as a set, so the set form can prefill from them (DATA_MODEL prefill order).
export function targetsAsSet(targets: Targets | null): SetValues | null {
  if (!targets) return null;
  const set: SetValues = {
    setType: 'normal',
    weightGrams: targets.targetWeightGrams,
    reps: targets.targetReps,
    durationSeconds: targets.targetDurationSeconds,
    distanceMeters: targets.targetDistanceMeters,
    rpe: null,
    notes: null,
  };
  const empty = set.weightGrams === null && set.reps === null && set.durationSeconds === null && set.distanceMeters === null;
  return empty ? null : set;
}
