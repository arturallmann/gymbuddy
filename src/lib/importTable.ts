// Reads an export table back into workouts (decision 024). Pure functions: no database, no React.
// Columns are found by their header, so a file whose columns were reordered still works.
import { LOAD_TYPES, PHASES, SET_TYPES, type LoadType, type Phase, type SetType } from '@/db/schema';
import { LOAD_TYPE_EXPORT_LABELS, type Cell } from './exportTable';
import { PHASE_LABELS } from './phases';
import { SET_TYPE_LABELS, type SetValues } from './sets';
import { distanceToMeters, parseDecimal, parseDuration, weightToGrams, type DistanceInputUnit } from './units';

export type ImportWorkoutExercise = {
  name: string;
  // Null when the file has no load type for the row.
  loadType: LoadType | null;
  phase: Phase;
  notes: string | null;
  sets: SetValues[];
};

export type ImportWorkout = {
  startedAt: Date;
  // The start time when the file has no end time.
  endedAt: Date;
  notes: string | null;
  exercises: ImportWorkoutExercise[];
};

export type ParsedImport =
  | { ok: true; workouts: ImportWorkout[]; setCount: number }
  | { ok: false; errors: string[] };

const REQUIRED = ['Date', 'Start time', 'Exercise'] as const;
const DISTANCE_UNITS: DistanceInputUnit[] = ['m', 'km', 'ft', 'mi'];

// Matches a label from the export ("Warm-up set") or a code value ("warmup"), ignoring case.
function matcher<T extends string>(codes: readonly T[], labels: Record<T, string>) {
  return (text: string): T | undefined => {
    const wanted = text.trim().toLowerCase();
    return codes.find((code) => code === wanted || labels[code].toLowerCase() === wanted);
  };
}
const findSetType = matcher<SetType>(SET_TYPES, SET_TYPE_LABELS);
const findPhase = matcher<Phase>(PHASES, PHASE_LABELS);
const findLoadType = matcher<LoadType>(LOAD_TYPES, LOAD_TYPE_EXPORT_LABELS);

const text = (cell: Cell | undefined): string => (cell === null || cell === undefined ? '' : String(cell).trim());

function number(cell: Cell | undefined): number | null {
  if (typeof cell === 'number') return cell;
  return text(cell) ? parseDecimal(text(cell)) : null;
}

// Throws the reason, which parseImportTable turns into "Row 5: …".
function fail(reason: string): never {
  throw new Error(reason);
}

function parseDateTime(date: string, time: string): Date {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) ?? fail(`Date must look like 2026-10-29, not "${date}".`);
  const clock = /^(\d{1,2}):(\d{2})$/.exec(time) ?? fail(`Time must look like 09:47, not "${time}".`);
  const result = new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]), Number(clock[1]), Number(clock[2]));
  if (Number.isNaN(result.getTime()) || result.getDate() !== Number(day[3]) || Number(clock[1]) > 23 || Number(clock[2]) > 59) {
    fail(`"${date} ${time}" is not a real date and time.`);
  }
  return result;
}

type Row = {
  startedAt: Date;
  endedAt: Date;
  workoutNotes: string | null;
  name: string;
  phase: Phase;
  setNumber: number | null;
  loadType: LoadType | null;
  notes: string | null;
  set: SetValues;
};

function parseRow(get: (column: string) => Cell | undefined): Row {
  const date = text(get('Date'));
  const startedAt = parseDateTime(date, text(get('Start time')));
  let endedAt = startedAt;
  if (text(get('End time'))) {
    endedAt = parseDateTime(date, text(get('End time')));
    // A workout that ends after midnight ends on the next day.
    if (endedAt < startedAt) endedAt = new Date(endedAt.getTime() + 24 * 60 * 60 * 1000);
  }
  const name = text(get('Exercise')) || fail('Exercise is empty.');

  const phase = text(get('Phase')) ? (findPhase(text(get('Phase'))) ?? fail(`Unknown phase "${text(get('Phase'))}".`)) : 'main';
  const setType = text(get('Set type'))
    ? (findSetType(text(get('Set type'))) ?? fail(`Unknown set type "${text(get('Set type'))}".`))
    : 'normal';
  const loadType = text(get('Load type'))
    ? (findLoadType(text(get('Load type'))) ?? fail(`Unknown load type "${text(get('Load type'))}".`))
    : null;

  const setText = text(get('Set'));
  const setNumber = setText ? Number(setText) : null;
  if (setNumber !== null && !(Number.isInteger(setNumber) && setNumber > 0)) fail(`Set must be a whole number, not "${setText}".`);

  let weightGrams: number | null = null;
  if (text(get('Weight'))) {
    const weight = number(get('Weight')) ?? fail(`Weight must be a number, not "${text(get('Weight'))}".`);
    const unit = text(get('Weight unit')).toLowerCase();
    if (unit !== 'kg' && unit !== 'lb') fail(`Weight unit must be kg or lb, not "${text(get('Weight unit'))}".`);
    weightGrams = weightToGrams(weight, unit);
  }

  let reps: number | null = null;
  if (text(get('Reps'))) {
    reps = number(get('Reps'));
    if (reps === null || !Number.isInteger(reps) || reps < 0) fail(`Reps must be a whole number, not "${text(get('Reps'))}".`);
  }

  let durationSeconds: number | null = null;
  if (text(get('Duration (s)'))) {
    const raw = text(get('Duration (s)'));
    durationSeconds = raw.includes(':') ? parseDuration(raw) : number(get('Duration (s)'));
    if (durationSeconds === null || durationSeconds < 0) fail(`Duration must be seconds or 1:30, not "${raw}".`);
    durationSeconds = Math.round(durationSeconds);
  }

  let distanceMeters: number | null = null;
  if (text(get('Distance'))) {
    const distance = number(get('Distance'));
    if (distance === null || distance < 0) fail(`Distance must be a positive number, not "${text(get('Distance'))}".`);
    const unit = text(get('Distance unit')).toLowerCase() as DistanceInputUnit;
    if (!DISTANCE_UNITS.includes(unit)) fail(`Distance unit must be m, km, ft or mi, not "${text(get('Distance unit'))}".`);
    distanceMeters = distanceToMeters(distance, unit);
  }

  let rpe: number | null = null;
  if (text(get('RPE'))) {
    rpe = number(get('RPE'));
    if (rpe === null || rpe < 1 || rpe > 10) fail(`RPE must be between 1 and 10, not "${text(get('RPE'))}".`);
  }

  return {
    startedAt,
    endedAt,
    workoutNotes: text(get('Workout notes')) || null,
    name,
    phase,
    setNumber,
    loadType,
    notes: text(get('Exercise notes in workout')) || null,
    set: { setType, weightGrams, reps, durationSeconds, distanceMeters, rpe, notes: text(get('Set notes')) || null },
  };
}

// Checks every row first. Any problem means no workouts, and a list of what to fix (decision 024).
// Rows of one workout share date and start time. Inside a workout, a new workout exercise starts
// when the exercise or phase changes, or when the set number does not go up.
export function parseImportTable(table: Cell[][]): ParsedImport {
  const [header, ...body] = table;
  if (!header) return { ok: false, errors: ['The file is empty.'] };
  const columns = new Map(header.map((title, index) => [text(title).toLowerCase(), index]));
  const missing = REQUIRED.filter((column) => !columns.has(column.toLowerCase()));
  if (missing.length > 0) {
    return { ok: false, errors: [`The file has no column ${missing.map((column) => `"${column}"`).join(', ')}.`] };
  }

  const errors: string[] = [];
  const rows: Row[] = [];
  body.forEach((cells, index) => {
    if (cells.every((cell) => text(cell) === '')) return;
    const get = (column: string) => {
      const at = columns.get(column.toLowerCase());
      return at === undefined ? undefined : cells[at];
    };
    try {
      rows.push(parseRow(get));
    } catch (error) {
      errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  if (errors.length > 0) return { ok: false, errors };
  if (rows.length === 0) return { ok: false, errors: ['The file has no sets.'] };

  const workouts = new Map<number, ImportWorkout>();
  const lastRow = new Map<number, Row>();
  for (const row of rows) {
    const key = row.startedAt.getTime();
    const workout = workouts.get(key) ?? { startedAt: row.startedAt, endedAt: row.endedAt, notes: null, exercises: [] };
    workouts.set(key, workout);
    workout.notes ??= row.workoutNotes;
    if (row.endedAt > workout.endedAt) workout.endedAt = row.endedAt;

    const previous = lastRow.get(key);
    const current = workout.exercises.at(-1);
    const sameExercise =
      previous &&
      current &&
      previous.name.toLowerCase() === row.name.toLowerCase() &&
      previous.phase === row.phase &&
      (row.setNumber === null || previous.setNumber === null || row.setNumber > previous.setNumber);
    if (sameExercise) {
      current.sets.push(row.set);
      current.notes ??= row.notes;
    } else {
      workout.exercises.push({ name: row.name, loadType: row.loadType, phase: row.phase, notes: row.notes, sets: [row.set] });
    }
    lastRow.set(key, row);
  }
  return { ok: true, workouts: [...workouts.values()], setCount: rows.length };
}
