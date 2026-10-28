import { describe, expect, test } from 'vitest';
import { DEFAULT_FEATURES } from '@/db/schema';
import { FEATURES, PRESET_FEATURES, resolveFeatures } from './features';

describe('features', () => {
  test('use the defaults for toggles that are not stored', () => {
    expect(resolveFeatures({})).toEqual(DEFAULT_FEATURES);
    expect(resolveFeatures({ rpe: true })).toEqual({ ...DEFAULT_FEATURES, rpe: true });
  });

  test('default to the standard preset', () => {
    expect(DEFAULT_FEATURES).toEqual(PRESET_FEATURES.standard);
  });

  test('list every feature toggle once in the interface text', () => {
    expect(FEATURES.map((feature) => feature.name).sort()).toEqual(Object.keys(DEFAULT_FEATURES).sort());
  });
});
