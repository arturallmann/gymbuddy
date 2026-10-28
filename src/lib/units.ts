// All unit conversion and formatting. Storage is always grams, seconds and
// meters (decision 005); only the interface uses kg, lb, km, mi and so on.
import type { DistanceUnit, ExercisePreferences, LoadType, UserSettings, WeightUnit } from '@/db/schema';

export const GRAMS_PER_KILOGRAM = 1000;
export const GRAMS_PER_POUND = 453.59237;
export const METERS_PER_KILOMETER = 1000;
export const METERS_PER_FOOT = 0.3048;
export const METERS_PER_MILE = 1609.344;

// The units for one exercise: its unit override if set, otherwise the settings.
export type Units = { weightUnit: WeightUnit; distanceUnit: DistanceUnit };

export function getUnits(
  settings: Pick<UserSettings, 'weightUnit' | 'distanceUnit'>,
  preferences?: Pick<ExercisePreferences, 'weightUnit' | 'distanceUnit'> | null,
): Units {
  return {
    weightUnit: preferences?.weightUnit ?? settings.weightUnit,
    distanceUnit: preferences?.distanceUnit ?? settings.distanceUnit,
  };
}

// Shows a number with at most `decimals` decimals and no trailing zeros.
function formatNumber(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  const trimmed = decimals > 0 ? fixed.replace(/\.?0+$/, '') : fixed;
  return trimmed === '-0' ? '0' : trimmed;
}

// --- Weight ---

// kg rounds to 0.05 kg and lb to 0.1 lb, so 45 lb shows as 45 lb again.
export function gramsToWeight(grams: number, unit: WeightUnit): number {
  if (unit === 'kg') {
    return Math.round((grams / GRAMS_PER_KILOGRAM) * 20) / 20;
  }
  return Math.round((grams / GRAMS_PER_POUND) * 10) / 10;
}

// Converts user input to whole grams for saving.
export function weightToGrams(value: number, unit: WeightUnit): number {
  const grams = value * (unit === 'kg' ? GRAMS_PER_KILOGRAM : GRAMS_PER_POUND);
  return Math.round(grams);
}

// 12500 g → "12.5 kg"
export function formatWeight(grams: number, unit: WeightUnit): string {
  return `${formatNumber(gramsToWeight(grams, unit), 2)} ${unit}`;
}

// How a set's weight reads for the exercise's load type. See docs/DATA_MODEL.md.
// external: "12 kg"; bodyweight: "BW", "BW + 5 kg", "BW − 20 kg"; none: "".
export function formatLoad(weightGrams: number | null, loadType: LoadType, unit: WeightUnit): string {
  if (loadType === 'none') {
    return '';
  }
  if (loadType === 'external') {
    return weightGrams === null ? '' : formatWeight(weightGrams, unit);
  }
  if (weightGrams === null || gramsToWeight(weightGrams, unit) === 0) {
    return 'BW';
  }
  const sign = weightGrams > 0 ? '+' : '−';
  return `BW ${sign} ${formatWeight(Math.abs(weightGrams), unit)}`;
}

// --- Distance ---

// Units for distance input: metric uses m and km, imperial uses ft and mi.
export type DistanceInputUnit = 'm' | 'km' | 'ft' | 'mi';

export const DISTANCE_INPUT_UNITS: Record<DistanceUnit, [DistanceInputUnit, DistanceInputUnit]> = {
  metric: ['m', 'km'],
  imperial: ['ft', 'mi'],
};

const METERS_PER_INPUT_UNIT: Record<DistanceInputUnit, number> = {
  m: 1,
  km: METERS_PER_KILOMETER,
  ft: METERS_PER_FOOT,
  mi: METERS_PER_MILE,
};

// Converts user input to whole meters for saving.
export function distanceToMeters(value: number, unit: DistanceInputUnit): number {
  return Math.round(value * METERS_PER_INPUT_UNIT[unit]);
}

// Below this distance the short unit (m or ft) reads better.
const SHORT_DISTANCE_LIMIT: Record<DistanceUnit, number> = {
  metric: METERS_PER_KILOMETER,
  imperial: 0.1 * METERS_PER_MILE,
};

// Picks m or km, ft or mi, and rounds: m and ft to whole numbers, km and mi to 0.01.
export function metersToDistance(
  meters: number,
  unit: DistanceUnit,
): { value: number; unit: DistanceInputUnit } {
  const [short, long] = DISTANCE_INPUT_UNITS[unit];
  if (Math.abs(meters) < SHORT_DISTANCE_LIMIT[unit]) {
    return { value: Math.round(meters / METERS_PER_INPUT_UNIT[short]), unit: short };
  }
  return { value: Math.round((meters / METERS_PER_INPUT_UNIT[long]) * 100) / 100, unit: long };
}

// 5000 m → "5 km"
export function formatDistance(meters: number, unit: DistanceUnit): string {
  const distance = metersToDistance(meters, unit);
  return `${formatNumber(distance.value, 2)} ${distance.unit}`;
}

// --- Duration ---

// 90 → "1:30", 3723 → "1:02:03"
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}

// "1:30" → 90, "1:02:03" → 3723, "45" → 45. Returns null for invalid input.
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }
  return parts.reduce((total, part) => total * 60 + Number(part), 0);
}
