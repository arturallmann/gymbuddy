// Suggests units for first-time setup from the phone's language and region.
import type { Units } from './units';

// Regions that use pounds and imperial distance.
const POUND_REGIONS = new Set(['US', 'LR', 'MM']);
// Regions that use kilograms but miles.
const MILE_REGIONS = new Set(['GB']);

export function regionOf(locale: string): string | undefined {
  try {
    return new Intl.Locale(locale).maximize().region;
  } catch {
    return undefined;
  }
}

// "en-US" → lb and imperial, "en-GB" → kg and imperial, "de-DE" → kg and metric.
export function suggestUnits(locale: string): Units {
  const region = regionOf(locale);
  if (region && POUND_REGIONS.has(region)) {
    return { weightUnit: 'lb', distanceUnit: 'imperial' };
  }
  if (region && MILE_REGIONS.has(region)) {
    return { weightUnit: 'kg', distanceUnit: 'imperial' };
  }
  return { weightUnit: 'kg', distanceUnit: 'metric' };
}
