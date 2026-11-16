// "Done before" first (decision 037): exercises the user did come first in search results and
// muscle group lists, the most frequent first, so a regular barbell squat beats a goblet squat
// tried once. Nothing is hidden: the other exercises follow in their own order.
import type { ExerciseUse } from '@/db/progress';

export function splitByUse<T extends { id: string; name: string }>(
  items: T[],
  use: Map<string, ExerciseUse>,
): { doneBefore: T[]; rest: T[] } {
  const doneBefore = items
    .filter((item) => use.has(item.id))
    .sort((a, b) => {
      const ua = use.get(a.id)!;
      const ub = use.get(b.id)!;
      return ub.workouts - ua.workouts || ub.lastAt.getTime() - ua.lastAt.getTime() || a.name.localeCompare(b.name);
    });
  return { doneBefore, rest: items.filter((item) => !use.has(item.id)) };
}

// "1 workout", "12 workouts".
export function formatUse(use: ExerciseUse): string {
  return use.workouts === 1 ? '1 workout' : `${use.workouts} workouts`;
}
