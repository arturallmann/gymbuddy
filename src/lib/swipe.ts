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

// The class that slides new content in from the side it comes from (decision 045): the next tab, month
// or week from the right, the one before from the left. No class before the first change.
export function slideClass(direction: -1 | 1 | null): string {
  if (direction === 1) return 'slide-from-right';
  if (direction === -1) return 'slide-from-left';
  return '';
}

// 1 when `to` comes after `from` in `tabs`, -1 when before, null when it is the same tab.
export function tabDirection<T>(tabs: T[], from: T, to: T): -1 | 1 | null {
  const a = tabs.indexOf(from);
  const b = tabs.indexOf(to);
  return a === b ? null : b > a ? 1 : -1;
}
