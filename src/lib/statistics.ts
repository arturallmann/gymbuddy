// Statistics from the fixed fields (decision 010) with the counting rules of decision 043.
// Pure functions: no database, no React. Weight and volume are in grams.
import type { Bodyweight, Exercise, LoadType, MuscleGroupRole, WorkoutSet } from '@/db/schema';
import { addDays, startOfWeek } from './calendar';
import { dayRange } from './dates';
import { formatDistance, formatDuration, formatLoad, formatWeight, type Units } from './units';

type StatSet = Pick<WorkoutSet, 'weightGrams' | 'reps' | 'durationSeconds' | 'distanceMeters'>;
type Tracked = Pick<Exercise, 'loadType' | 'tracksReps' | 'tracksDuration' | 'tracksDistance'>;

// --- Bodyweight ---

// The bodyweight that applies at `date`: the newest one measured on that day or before.
// A bodyweight applies from the start of its day, so weighing after a workout still counts for it;
// a later bodyweight never changes earlier days. Null before the first bodyweight.
export function bodyweightAt(bodyweights: Pick<Bodyweight, 'weightGrams' | 'measuredAt'>[], date: Date): number | null {
  let found: number | null = null;
  let foundAt = -Infinity;
  for (const entry of bodyweights) {
    const at = entry.measuredAt.getTime();
    if (dayRange(entry.measuredAt).from.getTime() <= date.getTime() && at >= foundAt) {
      found = entry.weightGrams;
      foundAt = at;
    }
  }
  return found;
}

// --- One set ---

// Sets with more reps say little about the one-rep max, so they give no e1RM.
export const E1RM_MAX_REPS = 12;

// Estimated one-rep max with the Epley formula: weight × (1 + reps ÷ 30), from sets of 1 to 12 reps.
// A set of 1 rep is its own weight. Null without a weight above zero or outside 1–12 reps.
export function estimatedOneRepMax(weightGrams: number | null, reps: number | null): number | null {
  if (weightGrams === null || weightGrams <= 0 || reps === null || reps < 1 || reps > E1RM_MAX_REPS) return null;
  return reps === 1 ? weightGrams : Math.round(weightGrams * (1 + reps / 30));
}

// Volume of one set: weight × reps. On a bodyweight exercise the weight is the bodyweight plus the
// added weight, and without a known bodyweight the set has no volume. Load type none has no volume.
export function setVolume(set: StatSet, loadType: LoadType, bodyweightGrams: number | null): number | null {
  if (set.reps === null || set.reps <= 0) return null;
  if (loadType === 'external') return set.weightGrams === null ? null : set.weightGrams * set.reps;
  if (loadType === 'bodyweight') {
    if (bodyweightGrams === null) return null;
    return Math.max(0, bodyweightGrams + (set.weightGrams ?? 0)) * set.reps;
  }
  return null;
}

// Sum of the set volumes, or null when no set has a volume.
export function totalVolume(sets: StatSet[], loadType: LoadType, bodyweightGrams: number | null): number | null {
  const volumes = sets.map((set) => setVolume(set, loadType, bodyweightGrams)).filter((v): v is number => v !== null);
  return volumes.length === 0 ? null : volumes.reduce((sum, v) => sum + v, 0);
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

export type StatisticsSpan = '4w' | '3m' | '1y';

export const SPAN_LABELS: Record<StatisticsSpan, string> = { '4w': '4 weeks', '3m': '3 months', '1y': 'Year' };

// The time span ending today: 4 whole weeks, 3 months or 12 months back from tomorrow's midnight.
export function spanRange(span: StatisticsSpan, today: Date): { from: Date; to: Date } {
  const to = dayRange(today).to;
  if (span === '4w') return { from: addDays(to, -28), to };
  const months = span === '3m' ? 3 : 12;
  return { from: new Date(to.getFullYear(), to.getMonth() - months, to.getDate()), to };
}

// One set in the statistics time span, with its workout and exercise.
export type StatisticsRow = { workoutId: string; startedAt: Date; exerciseId: string; set: StatSet };

export type StatisticsExercise = Tracked & {
  id: string;
  name: string;
  // `key` is the library name, such as "lower back"; the muscle map finds its area by it.
  muscleGroups: { id: string; key: string; name: string; role: MuscleGroupRole }[];
};

export type StatisticsInput = {
  rows: StatisticsRow[];
  exercises: Map<string, StatisticsExercise>;
  bodyweights: Pick<Bodyweight, 'weightGrams' | 'measuredAt'>[];
};

// Volume of one set row, with the bodyweight of its workout's day.
function rowVolume(row: StatisticsRow, input: StatisticsInput): number | null {
  const exercise = input.exercises.get(row.exerciseId);
  if (!exercise) return null;
  const bodyweight = exercise.loadType === 'bodyweight' ? bodyweightAt(input.bodyweights, row.startedAt) : null;
  return setVolume(row.set, exercise.loadType, bodyweight);
}

export type WorkoutTotals = { workouts: number; sets: number; volume: number };

export function workoutTotals(input: StatisticsInput): WorkoutTotals {
  return {
    workouts: new Set(input.rows.map((row) => row.workoutId)).size,
    sets: input.rows.length,
    volume: input.rows.reduce((sum, row) => sum + (rowVolume(row, input) ?? 0), 0),
  };
}

export type WeekBar = { weekStart: Date; workouts: number; sets: number; volume: number };

// One bar per week in the span, oldest first; weeks start on `firstDay`.
export function weeklyTotals(input: StatisticsInput, range: { from: Date; to: Date }, firstDay: number): WeekBar[] {
  const weeks: WeekBar[] = [];
  for (let start = startOfWeek(range.from, firstDay); start < range.to; start = addDays(start, 7)) {
    weeks.push({ weekStart: start, workouts: 0, sets: 0, volume: 0 });
  }
  const seen = new Set<string>();
  for (const row of input.rows) {
    const week = [...weeks].reverse().find((w) => w.weekStart.getTime() <= row.startedAt.getTime());
    if (!week) continue;
    if (!seen.has(row.workoutId)) {
      seen.add(row.workoutId);
      week.workouts += 1;
    }
    week.sets += 1;
    week.volume += rowVolume(row, input) ?? 0;
  }
  return weeks;
}

export type ExerciseSummary = {
  exercise: StatisticsExercise;
  workouts: number;
  sets: number;
  volume: number | null;
  // The top value in the span of the exercise's first personal record kind (e1RM, added weight, reps, …).
  top: { kind: PersonalRecordKind; value: number } | null;
};

// The exercises done in the span, most workouts first, then by name.
export function exerciseSummaries(input: StatisticsInput): ExerciseSummary[] {
  const rowsBy = new Map<string, StatisticsRow[]>();
  for (const row of input.rows) rowsBy.set(row.exerciseId, [...(rowsBy.get(row.exerciseId) ?? []), row]);
  const summaries = [...rowsBy.entries()].flatMap(([exerciseId, rows]): ExerciseSummary[] => {
    const exercise = input.exercises.get(exerciseId);
    if (!exercise) return [];
    const volumes = rows.map((row) => rowVolume(row, input)).filter((v): v is number => v !== null);
    const records = personalRecords(byWorkout(rows), exercise);
    return [
      {
        exercise,
        workouts: new Set(rows.map((row) => row.workoutId)).size,
        sets: rows.length,
        volume: volumes.length ? volumes.reduce((sum, v) => sum + v, 0) : null,
        top: records[0] ? { kind: records[0].kind, value: records[0].value } : null,
      },
    ];
  });
  return summaries.sort((a, b) => b.workouts - a.workouts || a.exercise.name.localeCompare(b.exercise.name));
}

// A secondary muscle group counts half (decision 043).
export const SECONDARY_SHARE = 0.5;

export type MuscleGroupSummary = {
  id: string;
  key: string;
  name: string;
  // Sets where the muscle group is primary (count 1) and secondary (count ½ each, already halved).
  primarySets: number;
  secondarySets: number;
  volume: number;
  exercises: string[];
};

// Sets and volume per muscle group in the span, most sets first.
export function muscleGroupSummaries(input: StatisticsInput): MuscleGroupSummary[] {
  const groups = new Map<string, MuscleGroupSummary>();
  for (const row of input.rows) {
    const exercise = input.exercises.get(row.exerciseId);
    if (!exercise) continue;
    const volume = rowVolume(row, input) ?? 0;
    for (const group of exercise.muscleGroups) {
      const share = group.role === 'primary' ? 1 : SECONDARY_SHARE;
      const entry = groups.get(group.id) ?? { id: group.id, key: group.key, name: group.name, primarySets: 0, secondarySets: 0, volume: 0, exercises: [] };
      if (group.role === 'primary') entry.primarySets += 1;
      else entry.secondarySets += share;
      entry.volume += volume * share;
      if (!entry.exercises.includes(exercise.name)) entry.exercises.push(exercise.name);
      groups.set(group.id, entry);
    }
  }
  return [...groups.values()].sort(
    (a, b) => b.primarySets + b.secondarySets - (a.primarySets + a.secondarySets) || a.name.localeCompare(b.name),
  );
}

// "8", "7.5": set counts with halves.
export function formatSets(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

// "1 set", "0.5 sets", "7.5 sets": a set count rounded to 0.1.
export function formatSetCount(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${formatSets(rounded)} ${rounded === 1 ? 'set' : 'sets'}`;
}
