import { describe, expect, test } from 'vitest';
import { DEFAULT_FEATURES, type FeatureToggles } from '@/db/schema';
import { extraFieldsLabel, formatSet, parseSetForm, setFormFields, setFormValues, type SetFormExercise, type SetValues } from './sets';
import type { Units } from './units';

const kg: Units = { weightUnit: 'kg', distanceUnit: 'metric' };
const lb: Units = { weightUnit: 'lb', distanceUnit: 'imperial' };
const curl: SetFormExercise = { loadType: 'external', tracksReps: true, tracksDuration: false, tracksDistance: false };
const pullUp: SetFormExercise = { ...curl, loadType: 'bodyweight' };
const plank: SetFormExercise = { loadType: 'bodyweight', tracksReps: false, tracksDuration: true, tracksDistance: false };
const run: SetFormExercise = { loadType: 'none', tracksReps: false, tracksDuration: true, tracksDistance: true };
const all: FeatureToggles = { ...DEFAULT_FEATURES, rpe: true, setTypes: true, setNotes: true };
const none: FeatureToggles = { ...DEFAULT_FEATURES, rpe: false, setTypes: false, setNotes: false };

const empty = setFormValues(null, kg);
const set = (values: Partial<SetValues>): SetValues => ({
  setType: 'normal',
  weightGrams: null,
  reps: null,
  durationSeconds: null,
  distanceMeters: null,
  rpe: null,
  notes: null,
  ...values,
});

describe('setFormFields', () => {
  test('follow the load type and tracked fields', () => {
    expect(setFormFields(curl, none)).toMatchObject({ weight: true, reps: true, duration: false, distance: false });
    expect(setFormFields(plank, none)).toMatchObject({ weight: true, reps: false, duration: true });
    expect(setFormFields(run, none)).toMatchObject({ weight: false, duration: true, distance: true });
  });

  test('follow the feature toggles for RPE, set type and notes', () => {
    expect(setFormFields(curl, none)).toMatchObject({ rpe: false, setType: false, notes: false });
    expect(setFormFields(curl, all)).toMatchObject({ rpe: true, setType: true, notes: true });
  });
});

describe('parseSetForm', () => {
  test('store weight in grams and reps', () => {
    const parsed = parseSetForm({ ...empty, weight: '12,5', reps: '8' }, curl, none, kg);
    expect(parsed).toEqual({ ok: true, values: set({ weightGrams: 12500, reps: 8 }) });
  });

  test('convert pounds to whole grams', () => {
    const parsed = parseSetForm({ ...setFormValues(null, lb), weight: '45', reps: '5' }, curl, none, lb);
    expect(parsed.ok && parsed.values.weightGrams).toBe(20412);
  });

  test('allow no added weight and negative added weight on a bodyweight exercise', () => {
    expect(parseSetForm({ ...empty, reps: '10' }, pullUp, none, kg)).toEqual({
      ok: true,
      values: set({ reps: 10 }),
    });
    const assisted = parseSetForm({ ...empty, weight: '-20', reps: '5' }, pullUp, none, kg);
    expect(assisted.ok && assisted.values.weightGrams).toBe(-20000);
  });

  test('reject negative weight on an external exercise', () => {
    expect(parseSetForm({ ...empty, weight: '-5', reps: '5' }, curl, none, kg)).toEqual({
      ok: false,
      error: 'Weight cannot be negative.',
    });
  });

  test('store duration in seconds and distance in meters', () => {
    const parsed = parseSetForm({ ...empty, duration: '25:00', distance: '5', distanceUnit: 'km' }, run, none, kg);
    expect(parsed).toEqual({ ok: true, values: set({ durationSeconds: 1500, distanceMeters: 5000 }) });
  });

  test('reject invalid input with a message', () => {
    expect(parseSetForm({ ...empty, reps: '8.5' }, curl, none, kg)).toMatchObject({ ok: false });
    expect(parseSetForm({ ...empty, weight: 'heavy' }, curl, none, kg)).toMatchObject({ ok: false });
    expect(parseSetForm({ ...empty, duration: '1:xx' }, plank, none, kg)).toMatchObject({ ok: false });
    expect(parseSetForm({ ...empty, reps: '5', rpe: '11' }, curl, all, kg)).toMatchObject({ ok: false });
  });

  test('need at least one value', () => {
    expect(parseSetForm(empty, curl, all, kg)).toEqual({ ok: false, error: 'Fill in at least one value.' });
  });

  test('store RPE, set type and notes only when their toggles are on', () => {
    const form = { ...empty, reps: '5', rpe: '8.5', setType: 'warmup' as const, notes: ' green band ' };
    expect(parseSetForm(form, curl, all, kg)).toEqual({
      ok: true,
      values: set({ reps: 5, rpe: 8.5, setType: 'warmup', notes: 'green band' }),
    });
    expect(parseSetForm(form, curl, none, kg)).toEqual({ ok: true, values: set({ reps: 5 }) });
  });

  test('ignore inputs the exercise does not show', () => {
    const parsed = parseSetForm({ ...empty, weight: '20', reps: '5', duration: '1:00' }, run, none, kg);
    expect(parsed).toEqual({ ok: true, values: set({ durationSeconds: 60 }) });
  });
});

describe('editing a set', () => {
  const stored = set({ weightGrams: 60000, reps: 8, rpe: 9, notes: 'belt', setType: 'failure' });

  test('show every value of the set, also notes and RPE', () => {
    expect(setFormValues(stored, kg, 'edit')).toMatchObject({
      weight: '60',
      reps: '8',
      rpe: '9',
      notes: 'belt',
      setType: 'failure',
    });
  });

  test('keep the values of hidden inputs, so a toggle that is off deletes nothing', () => {
    const form = { ...setFormValues(stored, kg, 'edit'), reps: '6' };
    expect(parseSetForm(form, curl, none, kg, stored)).toEqual({ ok: true, values: { ...stored, reps: 6 } });
  });

  test('clear a shown value when the user empties its input', () => {
    const form = { ...setFormValues(stored, kg, 'edit'), notes: '' };
    expect(parseSetForm(form, curl, all, kg, stored)).toEqual({ ok: true, values: { ...stored, notes: null } });
  });
});

describe('setFormValues', () => {
  test('start empty without an earlier set', () => {
    expect(empty).toMatchObject({ weight: '', reps: '', duration: '', distance: '', distanceUnit: 'km', setType: 'normal' });
  });

  test('prefill from an earlier set in the display units, without notes or RPE', () => {
    const earlier = set({ weightGrams: 20412, reps: 5, rpe: 9, notes: 'hard', setType: 'warmup' });
    expect(setFormValues(earlier, lb)).toMatchObject({
      weight: '45',
      reps: '5',
      rpe: '',
      notes: '',
      setType: 'warmup',
    });
  });

  test('prefill duration and distance in a readable form', () => {
    expect(setFormValues(set({ durationSeconds: 90, distanceMeters: 800 }), kg)).toMatchObject({
      duration: '1:30',
      distance: '800',
      distanceUnit: 'm',
    });
  });

  test('round trip: a prefilled form saves the same values', () => {
    const earlier = set({ weightGrams: 20412, reps: 5 });
    const parsed = parseSetForm(setFormValues(earlier, lb), curl, none, lb);
    expect(parsed).toEqual({ ok: true, values: earlier });
  });
});

describe('formatSet', () => {
  test('show weight × reps', () => {
    expect(formatSet(set({ weightGrams: 60000, reps: 8 }), 'external', kg)).toBe('60 kg × 8');
  });

  test('show bodyweight sets', () => {
    expect(formatSet(set({ reps: 10 }), 'bodyweight', kg)).toBe('BW × 10');
    expect(formatSet(set({ weightGrams: 5000, reps: 10 }), 'bodyweight', kg)).toBe('BW + 5 kg × 10');
    expect(formatSet(set({ durationSeconds: 60 }), 'bodyweight', kg)).toBe('1:00');
  });

  test('show distance and duration', () => {
    expect(formatSet(set({ distanceMeters: 5000, durationSeconds: 1500 }), 'none', kg)).toBe('5 km · 25:00');
  });

  test('show RPE and the set type, also when their toggles are off', () => {
    expect(formatSet(set({ weightGrams: 60000, reps: 8, rpe: 8, setType: 'dropset' }), 'external', kg)).toBe(
      '60 kg × 8 · RPE 8 · Drop set',
    );
  });
});

describe('extraFieldsLabel', () => {
  test('name the extra inputs that the feature toggles show', () => {
    expect(extraFieldsLabel({ rpe: true, setType: true, notes: true })).toBe('RPE, set type and notes');
    expect(extraFieldsLabel({ rpe: false, setType: true, notes: true })).toBe('Set type and notes');
    expect(extraFieldsLabel({ rpe: false, setType: false, notes: true })).toBe('Notes');
    expect(extraFieldsLabel({ rpe: false, setType: false, notes: false })).toBeNull();
  });
});
