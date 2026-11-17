// Personal records from the fixed fields, with the rules of decision 043: never the bodyweight.
// Pure functions: no database, no React. Weight and volume are in grams.
import type { Exercise, LoadType, WorkoutSet } from '@/db/schema';
import { formatDistance, formatDuration, formatLoad, formatWeight, type Units } from './units';

export type StatSet = Pick<WorkoutSet, 'weightGrams' | 'reps' | 'durationSeconds' | 'distanceMeters'>;

export type Tracked = Pick<Exercise, 'loadType' | 'tracksReps' | 'tracksDuration' | 'tracksDistance'>;

// --- e1RM ---

// Sets with more reps say little about the one-rep max, so they give no e1RM.
export const E1RM_MAX_REPS = 12;

// Estimated one-rep max with the Epley formula: weight × (1 + reps ÷ 30), from sets of 1 to 12 reps.
// A set of 1 rep is its own weight. Null without a weight above zero or outside 1–12 reps.
export function estimatedOneRepMax(weightGrams: number | null, reps: number | null): number | null {
  if (weightGrams === null || weightGrams <= 0 || reps === null || reps < 1 || reps > E1RM_MAX_REPS) return null;
  return reps === 1 ? weightGrams : Math.round(weightGrams * (1 + reps / 30));
}

// --- Personal records ---

export type PersonalRecordKind = 'e1rm' | 'weight' | 'reps' | 'volume' | 'duration' | 'distance';

export const PERSONAL_RECORD_LABELS: Record<PersonalRecordKind, string> = {
  e1rm: 'e1RM',
  weight: 'Heaviest weight',
  reps: 'Most reps',
  volume: 'Most volume',
  duration: 'Longest duration',
  distance: 'Longest distance',
};

// The personal records an exercise can have. Bodyweight never counts (decision 043): a bodyweight
// exercise has personal records for the added weight and the reps, never for volume or e1RM.
export function personalRecordKinds(exercise: Tracked): PersonalRecordKind[] {
  const kinds: PersonalRecordKind[] = [];
  if (exercise.loadType === 'external') {
    if (exercise.tracksReps) kinds.push('e1rm');
    kinds.push('weight');
    if (exercise.tracksReps) kinds.push('volume');
  }
  if (exercise.loadType === 'bodyweight') {
    kinds.push('weight');
    if (exercise.tracksReps) kinds.push('reps');
  }
  if (exercise.loadType === 'none' && exercise.tracksReps) kinds.push('reps');
  if (exercise.tracksDuration) kinds.push('duration');
  if (exercise.tracksDistance) kinds.push('distance');
  return kinds;
}

// A personal record value in the exercise's units: "116.7 kg", "BW + 20 kg", "12", "1:30", "5 km".
export function formatPersonalRecord(kind: PersonalRecordKind, value: number, loadType: LoadType, units: Units): string {
  switch (kind) {
    case 'weight':
      return loadType === 'bodyweight' ? formatLoad(value, loadType, units.weightUnit) : formatWeight(value, units.weightUnit);
    case 'e1rm':
    case 'volume':
      return formatWeight(value, units.weightUnit);
    case 'reps':
      return String(value);
    case 'duration':
      return formatDuration(value);
    case 'distance':
      return formatDistance(value, units.distanceUnit);
  }
}

// The value of one personal record kind in one workout, or null when no set has it.
// On a bodyweight exercise "weight" is the added weight and counts only above zero.
export function personalRecordValue(sets: StatSet[], kind: PersonalRecordKind, loadType: LoadType): number | null {
  const values = sets.flatMap((set): number[] => {
    switch (kind) {
      case 'e1rm': {
        const value = estimatedOneRepMax(set.weightGrams, set.reps);
        return value === null ? [] : [value];
      }
      case 'weight':
        if (set.weightGrams === null) return [];
        return loadType === 'bodyweight' && set.weightGrams <= 0 ? [] : [set.weightGrams];
      case 'reps':
        return set.reps === null ? [] : [set.reps];
      case 'volume':
        return set.weightGrams === null || set.reps === null ? [] : [set.weightGrams * set.reps];
      case 'duration':
        return set.durationSeconds === null ? [] : [set.durationSeconds];
      case 'distance':
        return set.distanceMeters === null ? [] : [set.distanceMeters];
    }
  });
  if (values.length === 0) return null;
  return kind === 'volume' ? values.reduce((sum, v) => sum + v, 0) : Math.max(...values);
}

// The sets of one exercise in one workout.
export type WorkoutSets = { workoutId: string; startedAt: Date; sets: StatSet[] };

// Groups rows of one exercise by workout, in the order of the rows.
export function byWorkout(rows: { workoutId: string; startedAt: Date; set: StatSet }[]): WorkoutSets[] {
  const map = new Map<string, WorkoutSets>();
  for (const row of rows) {
    const entry = map.get(row.workoutId) ?? { workoutId: row.workoutId, startedAt: row.startedAt, sets: [] };
    entry.sets.push(row.set);
    map.set(row.workoutId, entry);
  }
  return [...map.values()];
}

export type PersonalRecord = { kind: PersonalRecordKind; value: number; workoutId: string; startedAt: Date };

// The best value ever of each personal record kind, with the first workout that reached it.
export function personalRecords(workouts: WorkoutSets[], exercise: Tracked): PersonalRecord[] {
  const ordered = [...workouts].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  return personalRecordKinds(exercise).flatMap((kind) => {
    let best: PersonalRecord | null = null;
    for (const workout of ordered) {
      const value = personalRecordValue(workout.sets, kind, exercise.loadType);
      if (value !== null && (best === null || value > best.value)) {
        best = { kind, value, workoutId: workout.workoutId, startedAt: workout.startedAt };
      }
    }
    return best ? [best] : [];
  });
}

// The new personal records of one workout: values higher than in every earlier workout with the exercise.
// The first workout with an exercise has no new personal records, so they mean progress.
export function newPersonalRecordsIn(
  workouts: WorkoutSets[],
  exercise: Tracked,
  workoutId: string,
): { kind: PersonalRecordKind; value: number }[] {
  const workout = workouts.find((w) => w.workoutId === workoutId);
  if (!workout) return [];
  const earlier = workouts.filter((w) => w.startedAt.getTime() < workout.startedAt.getTime());
  return personalRecordKinds(exercise).flatMap((kind) => {
    const value = personalRecordValue(workout.sets, kind, exercise.loadType);
    if (value === null) return [];
    const before = earlier
      .map((w) => personalRecordValue(w.sets, kind, exercise.loadType))
      .filter((v): v is number => v !== null);
    return before.length > 0 && value > Math.max(...before) ? [{ kind, value }] : [];
  });
}

// --- Statistics page ---
