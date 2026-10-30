import { describe, expect, test } from 'vitest';
import {
  distanceToMeters,
  formatDistance,
  formatDuration,
  formatLoad,
  formatWeight,
  formatWorkoutDuration,
  getUnits,
  gramsToWeight,
  metersToDistance,
  parseDecimal,
  parseDuration,
  weightToGrams,
} from './units';

// 0, step, 2·step … max, without floating point drift.
function steps(max: number, step: number, decimals: number): number[] {
  const count = Math.round(max / step);
  return Array.from({ length: count + 1 }, (_, i) => Number((i * step).toFixed(decimals)));
}

describe('weight', () => {
  test('round-trip every 0.05 kg up to 500 kg', () => {
    for (const kg of steps(500, 0.05, 2)) {
      expect(gramsToWeight(weightToGrams(kg, 'kg'), 'kg')).toBe(kg);
    }
  });

  test('round-trip every 0.1 lb up to 1000 lb', () => {
    for (const lb of steps(1000, 0.1, 1)) {
      expect(gramsToWeight(weightToGrams(lb, 'lb'), 'lb')).toBe(lb);
    }
  });

  test('store whole grams', () => {
    expect(weightToGrams(1.25, 'kg')).toBe(1250);
    expect(weightToGrams(45, 'lb')).toBe(20412);
  });

  test('show 45 lb as 45 lb and 20 kg as 20 kg', () => {
    expect(formatWeight(weightToGrams(45, 'lb'), 'lb')).toBe('45 lb');
    expect(formatWeight(20000, 'kg')).toBe('20 kg');
    expect(formatWeight(12500, 'kg')).toBe('12.5 kg');
    expect(formatWeight(1250, 'kg')).toBe('1.25 kg');
  });

  test('convert between kg and lb for display', () => {
    expect(formatWeight(20000, 'lb')).toBe('44.1 lb');
    expect(formatWeight(weightToGrams(45, 'lb'), 'kg')).toBe('20.4 kg');
  });
});

describe('formatLoad', () => {
  test('show full weight for external load', () => {
    expect(formatLoad(12000, 'external', 'kg')).toBe('12 kg');
    expect(formatLoad(null, 'external', 'kg')).toBe('');
  });

  test('show added weight for bodyweight exercises', () => {
    expect(formatLoad(null, 'bodyweight', 'kg')).toBe('BW');
    expect(formatLoad(0, 'bodyweight', 'kg')).toBe('BW');
    expect(formatLoad(5000, 'bodyweight', 'kg')).toBe('BW + 5 kg');
    expect(formatLoad(-20000, 'bodyweight', 'kg')).toBe('BW − 20 kg');
  });

  test('show nothing when the exercise has no load', () => {
    expect(formatLoad(5000, 'none', 'kg')).toBe('');
  });
});

describe('distance', () => {
  test('round-trip whole meters below 1 km', () => {
    for (const m of steps(999, 1, 0)) {
      expect(metersToDistance(distanceToMeters(m, 'm'), 'metric')).toEqual({ value: m, unit: 'm' });
    }
  });

  test('round-trip every 0.01 km from 1 km to 100 km', () => {
    for (const km of steps(100, 0.01, 2).filter((value) => value >= 1)) {
      expect(metersToDistance(distanceToMeters(km, 'km'), 'metric')).toEqual({ value: km, unit: 'km' });
    }
  });

  test('round-trip every 0.01 mi from 0.1 mi to 100 mi', () => {
    for (const mi of steps(100, 0.01, 2).filter((value) => value >= 0.1)) {
      expect(metersToDistance(distanceToMeters(mi, 'mi'), 'imperial')).toEqual({ value: mi, unit: 'mi' });
    }
  });

  test('keep feet within 2 ft after a round trip through whole meters', () => {
    for (const ft of steps(520, 1, 0)) {
      const back = metersToDistance(distanceToMeters(ft, 'ft'), 'imperial');
      expect(back.unit).toBe('ft');
      expect(Math.abs(back.value - ft)).toBeLessThanOrEqual(2);
    }
  });

  test('format distances', () => {
    expect(formatDistance(800, 'metric')).toBe('800 m');
    expect(formatDistance(5000, 'metric')).toBe('5 km');
    expect(formatDistance(5250, 'metric')).toBe('5.25 km');
    expect(formatDistance(distanceToMeters(3.1, 'mi'), 'imperial')).toBe('3.1 mi');
    expect(formatDistance(distanceToMeters(100, 'ft'), 'imperial')).toBe('98 ft');
  });
});

describe('duration', () => {
  test('format seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(3723)).toBe('1:02:03');
  });

  test('parse durations', () => {
    expect(parseDuration('45')).toBe(45);
    expect(parseDuration('1:30')).toBe(90);
    expect(parseDuration(' 1:02:03 ')).toBe(3723);
    expect(parseDuration('1:x')).toBeNull();
    expect(parseDuration('')).toBeNull();
  });

  test('round-trip every second up to 3 hours', () => {
    for (const seconds of steps(3 * 3600, 1, 0)) {
      expect(parseDuration(formatDuration(seconds))).toBe(seconds);
    }
  });
});

describe('getUnits', () => {
  const settings = { weightUnit: 'kg', distanceUnit: 'metric' } as const;

  test('use the settings without an override', () => {
    expect(getUnits(settings)).toEqual({ weightUnit: 'kg', distanceUnit: 'metric' });
    expect(getUnits(settings, { weightUnit: null, distanceUnit: null })).toEqual(settings);
  });

  test('use the unit override of the exercise', () => {
    expect(getUnits(settings, { weightUnit: 'lb', distanceUnit: null })).toEqual({
      weightUnit: 'lb',
      distanceUnit: 'metric',
    });
  });
});

describe('parseDecimal', () => {
  test('read a point or a comma as the decimal mark', () => {
    expect(parseDecimal('12.5')).toBe(12.5);
    expect(parseDecimal(' 12,5 ')).toBe(12.5);
    expect(parseDecimal('.5')).toBe(0.5);
    expect(parseDecimal('20')).toBe(20);
  });

  test('read negative numbers', () => {
    expect(parseDecimal('-20')).toBe(-20);
  });

  test('return null for empty or invalid input', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('1.2.3')).toBeNull();
    expect(parseDecimal('1,2,3')).toBeNull();
    expect(parseDecimal('-')).toBeNull();
  });
});

describe('formatWorkoutDuration', () => {
  test('show minutes, then hours and minutes', () => {
    expect(formatWorkoutDuration(30)).toBe('< 1 min');
    expect(formatWorkoutDuration(45 * 60 + 59)).toBe('45 min');
    expect(formatWorkoutDuration(65 * 60)).toBe('1 h 5 min');
    expect(formatWorkoutDuration(120 * 60)).toBe('2 h 0 min');
  });
});
