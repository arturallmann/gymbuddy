// The history view and the chart view of one exercise. Pure functions: no database, no React.
// Charts use only the fixed fields and never parse notes (decision 010).
import type { HistoryRow } from '@/db/progress';
import type { Exercise, WorkoutSet } from '@/db/schema';
import { formatDistance, formatDuration, formatWeight, type Units } from './units';

export type Metric = 'weight' | 'reps' | 'volume' | 'duration' | 'distance';

export const METRIC_LABELS: Record<Metric, string> = {
  weight: 'Heaviest weight',
  reps: 'Most reps',
  volume: 'Volume',
  duration: 'Longest duration',
  distance: 'Longest distance',
};

type Chartable = Pick<Exercise, 'loadType' | 'tracksReps' | 'tracksDuration' | 'tracksDistance'>;

// The values the chart offers for this exercise. Empty for a note-only exercise, which then
// has the history view only.
export function chartMetrics(exercise: Chartable): Metric[] {
  const metrics: Metric[] = [];
  if (exercise.loadType !== 'none') metrics.push('weight');
  if (exercise.tracksReps) metrics.push('reps');
  if (exercise.loadType === 'external' && exercise.tracksReps) metrics.push('volume');
  if (exercise.tracksDuration) metrics.push('duration');
  if (exercise.tracksDistance) metrics.push('distance');
  return metrics;
}

// The value of one metric for one workout, from its sets, or null when no set has it.
// Weight and volume are in grams, duration in seconds, distance in meters.
export function workoutValue(sets: WorkoutSet[], metric: Metric): number | null {
  const values = sets.flatMap((set): number[] => {
    switch (metric) {
      case 'weight':
        return set.weightGrams === null ? [] : [set.weightGrams];
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
  return metric === 'volume' ? values.reduce((sum, value) => sum + value, 0) : Math.max(...values);
}

export type ChartPoint = { workoutId: string; startedAt: Date; value: number };

// One point per workout, oldest first. Workouts without a value for the metric are left out
// of the chart, but stay in the history.
export function chartPoints(rows: HistoryRow[], metric: Metric): ChartPoint[] {
  const perWorkout = new Map<string, { startedAt: Date; sets: WorkoutSet[] }>();
  for (const row of rows) {
    const entry = perWorkout.get(row.workoutId) ?? { startedAt: row.startedAt, sets: [] };
    entry.sets.push(row.set);
    perWorkout.set(row.workoutId, entry);
  }
  return [...perWorkout.entries()].flatMap(([workoutId, entry]) => {
    const value = workoutValue(entry.sets, metric);
    return value === null ? [] : [{ workoutId, startedAt: entry.startedAt, value }];
  });
}

// A metric value in the exercise's units: "60 kg", "12", "1:30", "5 km".
export function formatMetric(value: number, metric: Metric, units: Units): string {
  switch (metric) {
    case 'weight':
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

export type HistoryWorkout = {
  workoutId: string;
  startedAt: Date;
  items: { workoutExerciseId: string; notes: string | null; sets: WorkoutSet[] }[];
};

// The history view: workouts newest first; inside each, workout exercises and sets in order.
export function historyByWorkout(rows: HistoryRow[]): HistoryWorkout[] {
  const workouts: HistoryWorkout[] = [];
  for (const row of rows) {
    let workout = workouts.at(-1);
    if (!workout || workout.workoutId !== row.workoutId) {
      workout = { workoutId: row.workoutId, startedAt: row.startedAt, items: [] };
      workouts.push(workout);
    }
    let item = workout.items.at(-1);
    if (!item || item.workoutExerciseId !== row.workoutExerciseId) {
      item = { workoutExerciseId: row.workoutExerciseId, notes: row.workoutExerciseNotes, sets: [] };
      workout.items.push(item);
    }
    item.sets.push(row.set);
  }
  return workouts.reverse();
}

export type ChartBox = { width: number; height: number; padding: number };

// Positions of the points inside the chart box. X follows the dates, so gaps between
// workouts show; Y runs from zero (or the lowest value, if below zero) to the highest value.
// One point sits in the middle.
export function chartCoordinates(points: ChartPoint[], box: ChartBox): { x: number; y: number }[] {
  if (points.length === 0) return [];
  const times = points.map((point) => point.startedAt.getTime());
  const first = Math.min(...times);
  const span = Math.max(...times) - first;
  const top = Math.max(...points.map((point) => point.value));
  const bottom = Math.min(0, ...points.map((point) => point.value));
  const range = top - bottom || 1;
  const innerWidth = box.width - 2 * box.padding;
  const innerHeight = box.height - 2 * box.padding;
  return points.map((point) => ({
    x: box.padding + (span === 0 ? innerWidth / 2 : ((point.startedAt.getTime() - first) / span) * innerWidth),
    y: box.padding + innerHeight - ((point.value - bottom) / range) * innerHeight,
  }));
}
