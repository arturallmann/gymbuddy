// Turns export rows into a table in display units, for CSV and Excel.
// Pure functions: no database, no React.
import type { ExportRow } from '@/db/export';
import type { ExercisePreferences, Phase, UserSettings } from '@/db/schema';
import { SET_TYPE_LABELS } from './sets';
import { getUnits, gramsToWeight, metersToDistance } from './units';

export type Cell = string | number | null;
export type ExportTable = { header: string[]; rows: Cell[][] };

export const PHASE_LABELS: Record<Phase, string> = {
  warmup: 'Warm-up phase',
  main: 'Main phase',
  cooldown: 'Cool-down phase',
};

const LOAD_TYPE_EXPORT_LABELS = {
  external: 'Weight',
  bodyweight: 'Bodyweight + added weight',
  none: 'No weight',
} as const;

export const EXPORT_HEADER = [
  'Date',
  'Start time',
  'Exercise',
  'Phase',
  'Set',
  'Set type',
  'Load type',
  'Weight',
  'Weight unit',
  'Reps',
  'Duration (s)',
  'Distance',
  'Distance unit',
  'RPE',
  'Set notes',
  'Exercise notes in workout',
  'Workout notes',
];

const pad = (value: number) => String(value).padStart(2, '0');

// Local date and time of the phone: "2026-10-29" and "09:47".
export function exportDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function exportTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Weight in the exercise's unit (its unit override, otherwise the settings), duration in
// seconds and distance in m or km (ft or mi). On a bodyweight exercise the weight is the
// added weight; empty means bodyweight only.
export function buildExportTable(
  rows: ExportRow[],
  settings: Pick<UserSettings, 'weightUnit' | 'distanceUnit'>,
  preferences: Map<string, Pick<ExercisePreferences, 'weightUnit' | 'distanceUnit'>>,
): ExportTable {
  return {
    header: EXPORT_HEADER,
    rows: rows.map((row) => {
      const units = getUnits(settings, preferences.get(row.exerciseId));
      const hasWeight = row.weightGrams !== null && row.loadType !== 'none';
      const distance = row.distanceMeters !== null ? metersToDistance(row.distanceMeters, units.distanceUnit) : null;
      return [
        exportDate(row.workoutStartedAt),
        exportTime(row.workoutStartedAt),
        row.exerciseName,
        PHASE_LABELS[row.phase],
        row.setPosition,
        SET_TYPE_LABELS[row.setType],
        LOAD_TYPE_EXPORT_LABELS[row.loadType],
        hasWeight ? gramsToWeight(row.weightGrams!, units.weightUnit) : null,
        hasWeight ? units.weightUnit : null,
        row.reps,
        row.durationSeconds,
        distance?.value ?? null,
        distance?.unit ?? null,
        row.rpe,
        row.setNotes,
        row.workoutExerciseNotes,
        row.workoutNotes,
      ];
    }),
  };
}

// "gymbuddy-2026-10-29.csv"
export function exportFileName(date: Date, extension: 'csv' | 'xlsx'): string {
  return `gymbuddy-${exportDate(date)}.${extension}`;
}
