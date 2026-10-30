import { expect, test } from 'vitest';
import { defaultRoutineName, defaultSupersetName, formatTargets, targetsAsSet } from './templates';

const kg = { weightUnit: 'kg', distanceUnit: 'metric' } as const;
const none = { targetSets: null, targetReps: null, targetWeightGrams: null, targetDurationSeconds: null, targetDistanceMeters: null };

test('write targets with the number of sets in the display units', () => {
  expect(formatTargets({ ...none, targetSets: 3, targetReps: 8, targetWeightGrams: 22500 }, 'external', kg)).toBe('3 × 22.5 kg × 8');
  expect(formatTargets({ ...none, targetSets: 1, targetDurationSeconds: 60 }, 'bodyweight', kg)).toBe('1:00');
  expect(formatTargets({ ...none, targetSets: 2 }, 'external', kg)).toBe('2 sets');
  expect(formatTargets(none, 'external', kg)).toBe('');
});

test('name a new saved superset after its exercises', () => {
  expect(defaultSupersetName(['Curl', 'Press'])).toBe('Curl + Press');
});

test('turn targets into a set for the prefill, or null without values', () => {
  expect(targetsAsSet({ ...none, targetSets: 3, targetReps: 8, targetWeightGrams: 22500 })).toEqual({
    setType: 'normal',
    weightGrams: 22500,
    reps: 8,
    durationSeconds: null,
    distanceMeters: null,
    rpe: null,
    notes: null,
  });
  expect(targetsAsSet({ ...none, targetSets: 3 })).toBeNull();
  expect(targetsAsSet(null)).toBeNull();
});

test('name a new routine after the weekday of the workout', () => {
  expect(defaultRoutineName(new Date(2026, 9, 29, 9, 0), 'en-GB')).toBe('Thursday routine');
});
