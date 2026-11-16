// Addresses of the "Add exercise" flow (decisions 031 and 032).
import { CATEGORIES, type Category } from '@/db/schema';

// The workout exercise page for an exercise that may not be in the workout yet. `back` is the
// list it was opened from (a muscle group or the "Add exercise" page): its back arrow and
// Android Back return there.
export function logExerciseHref(exerciseId: string, back: string | null = null): string {
  return `/workout/exercise?exercise=${exerciseId}${backQuery(back)}`;
}

// A workout exercise page, keeping the list it was opened from.
export function workoutExerciseHref(workoutExerciseId: string, back: string | null = null): string {
  return `/workout/exercise?id=${workoutExerciseId}${backQuery(back)}`;
}

const backQuery = (back: string | null) => (back ? `&back=${encodeURIComponent(back)}` : '');

// Where the back arrow of a workout exercise page goes: the "Add exercise" list in the address,
// otherwise the workout. Only addresses of the "Add exercise" flow count, so the address cannot
// send Back anywhere else.
export function workoutExerciseBack(back: string | null): { href: string; label: string } {
  if (back === '/workout/add' || back?.startsWith('/workout/add?')) return { href: back, label: 'Back to add exercise' };
  if (back?.startsWith('/workout/add/muscle?')) return { href: back, label: 'Back to muscle group' };
  return { href: '/workout', label: 'Back to workout' };
}

const categoryQuery = (category: Category | null) => (category ? `category=${category}` : '');

// The "Add exercise" page, with the chosen category filter.
export function addExerciseHref(category: Category | null = null): string {
  return category ? `/workout/add?${categoryQuery(category)}` : '/workout/add';
}

// The exercises of one muscle group, to add to the workout, with the chosen category filter.
export function muscleGroupHref(muscleGroupId: string, category: Category | null = null): string {
  return `/workout/add/muscle?id=${muscleGroupId}${category ? `&${categoryQuery(category)}` : ''}`;
}

// The category in an address, or null when it is missing or unknown.
export function parseCategory(value: string | null): Category | null {
  return CATEGORIES.find((category) => category === value) ?? null;
}
