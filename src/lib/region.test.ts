import { describe, expect, test } from 'vitest';
import { regionOf, suggestUnits } from './region';

describe('suggestUnits', () => {
  test('suggest lb and imperial in the US', () => {
    expect(suggestUnits('en-US')).toEqual({ weightUnit: 'lb', distanceUnit: 'imperial' });
    expect(suggestUnits('es-US')).toEqual({ weightUnit: 'lb', distanceUnit: 'imperial' });
  });

  test('suggest kg and imperial in the UK', () => {
    expect(suggestUnits('en-GB')).toEqual({ weightUnit: 'kg', distanceUnit: 'imperial' });
  });

  test('suggest kg and metric elsewhere', () => {
    expect(suggestUnits('de-DE')).toEqual({ weightUnit: 'kg', distanceUnit: 'metric' });
    expect(suggestUnits('en-AU')).toEqual({ weightUnit: 'kg', distanceUnit: 'metric' });
  });

  test('use the likely region of a language without a region', () => {
    expect(regionOf('en')).toBe('US');
    expect(regionOf('et')).toBe('EE');
  });

  test('fall back to kg and metric for an invalid locale', () => {
    expect(suggestUnits('not a locale!')).toEqual({ weightUnit: 'kg', distanceUnit: 'metric' });
  });
});
