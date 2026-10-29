// The set form and how a set reads. Pure functions: no database, no React.
import type { Exercise, FeatureToggles, SetType, WorkoutSet } from '@/db/schema';
import {
  DISTANCE_INPUT_UNITS,
  distanceToMeters,
  formatDistance,
  formatDuration,
  formatLoad,
  gramsToWeight,
  metersToDistance,
  parseDecimal,
  parseDuration,
  weightToGrams,
  type DistanceInputUnit,
  type Units,
} from './units';

// What the set form needs to know about the exercise.
export type SetFormExercise = Pick<Exercise, 'loadType' | 'tracksReps' | 'tracksDuration' | 'tracksDistance'>;

// The values a set stores, apart from ids and timestamps.
export type SetValues = Pick<
  WorkoutSet,
  'setType' | 'weightGrams' | 'reps' | 'durationSeconds' | 'distanceMeters' | 'rpe' | 'notes'
>;

// The set form's inputs, as the user types them.
export type SetFormValues = {
  weight: string;
  reps: string;
  duration: string;
  distance: string;
  distanceUnit: DistanceInputUnit;
  rpe: string;
  setType: SetType;
  notes: string;
};

export const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: 'Normal set',
  warmup: 'Warm-up set',
  dropset: 'Drop set',
  failure: 'Failure set',
};

// Which inputs the set form shows. Toggles hide inputs only (docs/DATA_MODEL.md).
export function setFormFields(exercise: SetFormExercise, features: FeatureToggles) {
  return {
    weight: exercise.loadType !== 'none',
    reps: exercise.tracksReps,
    duration: exercise.tracksDuration,
    distance: exercise.tracksDistance,
    rpe: features.rpe,
    setType: features.setTypes,
    notes: features.setNotes,
  };
}

// Prefills the form from an earlier set. Notes and RPE start empty, unless
// `mode` is 'edit': then the form shows every value of the set being edited.
export function setFormValues(
  source: SetValues | null,
  units: Units,
  mode: 'prefill' | 'edit' = 'prefill',
): SetFormValues {
  const editing = mode === 'edit';
  const distance = source?.distanceMeters != null ? metersToDistance(source.distanceMeters, units.distanceUnit) : null;
  return {
    weight: source?.weightGrams != null ? String(gramsToWeight(source.weightGrams, units.weightUnit)) : '',
    reps: source?.reps != null ? String(source.reps) : '',
    duration: source?.durationSeconds != null ? formatDuration(source.durationSeconds) : '',
    distance: distance ? String(distance.value) : '',
    distanceUnit: distance?.unit ?? DISTANCE_INPUT_UNITS[units.distanceUnit][1],
    rpe: editing && source?.rpe != null ? String(source.rpe) : '',
    setType: source?.setType ?? 'normal',
    notes: editing ? (source?.notes ?? '') : '',
  };
}

// The title of the section with the extra inputs: "RPE, set type and notes", "Notes",
// or null when the feature toggles hide all of them.
export function extraFieldsLabel(fields: Pick<ReturnType<typeof setFormFields>, 'rpe' | 'setType' | 'notes'>): string | null {
  const labels = [fields.rpe && 'RPE', fields.setType && 'set type', fields.notes && 'notes'].filter(
    (label): label is string => Boolean(label),
  );
  if (labels.length === 0) return null;
  const text = labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}` : labels[0];
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type ParsedSet = { ok: true; values: SetValues } | { ok: false; error: string };

// Turns the form into stored values: grams, seconds and meters.
// Inputs the form does not show keep the value of `base`, the set being edited,
// so a feature toggle that is off never deletes data.
export function parseSetForm(
  form: SetFormValues,
  exercise: SetFormExercise,
  features: FeatureToggles,
  units: Units,
  base?: SetValues,
): ParsedSet {
  const fields = setFormFields(exercise, features);
  const keep = <K extends keyof SetValues>(key: K, shown: boolean, empty: SetValues[K]): SetValues[K] =>
    shown ? empty : (base?.[key] ?? empty);
  const values: SetValues = {
    setType: fields.setType ? form.setType : keep('setType', false, 'normal'),
    weightGrams: keep('weightGrams', fields.weight, null),
    reps: keep('reps', fields.reps, null),
    durationSeconds: keep('durationSeconds', fields.duration, null),
    distanceMeters: keep('distanceMeters', fields.distance, null),
    rpe: keep('rpe', fields.rpe, null),
    notes: keep('notes', fields.notes, null),
  };

  if (fields.weight && form.weight.trim()) {
    const weight = parseDecimal(form.weight);
    if (weight === null) return { ok: false, error: 'Weight must be a number.' };
    if (weight < 0 && exercise.loadType === 'external') return { ok: false, error: 'Weight cannot be negative.' };
    values.weightGrams = weightToGrams(weight, units.weightUnit);
  }
  if (fields.reps && form.reps.trim()) {
    const reps = form.reps.trim();
    if (!/^\d+$/.test(reps)) return { ok: false, error: 'Reps must be a whole number.' };
    values.reps = Number(reps);
  }
  if (fields.duration && form.duration.trim()) {
    const seconds = parseDuration(form.duration);
    if (seconds === null) return { ok: false, error: 'Duration must look like 1:30 or 45.' };
    values.durationSeconds = seconds;
  }
  if (fields.distance && form.distance.trim()) {
    const distance = parseDecimal(form.distance);
    if (distance === null || distance < 0) return { ok: false, error: 'Distance must be a positive number.' };
    values.distanceMeters = distanceToMeters(distance, form.distanceUnit);
  }
  if (fields.rpe && form.rpe.trim()) {
    const rpe = parseDecimal(form.rpe);
    if (rpe === null || rpe < 1 || rpe > 10) return { ok: false, error: 'RPE must be between 1 and 10.' };
    values.rpe = rpe;
  }
  if (fields.notes && form.notes.trim()) {
    values.notes = form.notes.trim();
  }

  // A bodyweight set without added weight is still a set, if it has reps, duration or distance.
  const hasValue =
    values.reps !== null ||
    values.durationSeconds !== null ||
    values.distanceMeters !== null ||
    values.notes !== null ||
    values.weightGrams !== null;
  if (!hasValue) {
    return { ok: false, error: 'Fill in at least one value.' };
  }
  return { ok: true, values };
}

// "60 kg × 8", "BW + 5 kg × 10", "1:30", "5 km in 25:00", followed by RPE and the set type.
// Shows every stored value, also when its feature toggle is off.
export function formatSet(set: SetValues, loadType: Exercise['loadType'], units: Units): string {
  const load = formatLoad(set.weightGrams, loadType, units.weightUnit);
  const parts: string[] = [];
  if (set.reps !== null) {
    parts.push(load ? `${load} × ${set.reps}` : `${set.reps} reps`);
  } else if (load && (set.weightGrams !== null || set.durationSeconds === null)) {
    parts.push(load);
  }
  if (set.distanceMeters !== null) parts.push(formatDistance(set.distanceMeters, units.distanceUnit));
  if (set.durationSeconds !== null) parts.push(formatDuration(set.durationSeconds));
  if (set.rpe !== null) parts.push(`RPE ${set.rpe}`);
  if (set.setType !== 'normal') parts.push(SET_TYPE_LABELS[set.setType]);
  return parts.join(' · ');
}
