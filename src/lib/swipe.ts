// Sideways swipes: changing tabs (decision 044) and the calendar's month or week.

// A swipe moves at least this far sideways, and clearly more sideways than down.
export const SWIPE_PX = 60;

type Point = { x: number; y: number };

// 1 for a swipe to the left (go to the next one), -1 to the right (the one before), null for no swipe.
export function swipeDirection(start: Point, end: Point): -1 | 1 | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) <= Math.abs(dy) * 1.5) return null;
  return dx < 0 ? 1 : -1;
}

// The tab next to `value` in `direction`, or null at either end.
export function tabAfter<T>(tabs: T[], value: T, direction: -1 | 1): T | null {
  const index = tabs.indexOf(value);
  if (index === -1) return null;
  return tabs[index + direction] ?? null;
}
