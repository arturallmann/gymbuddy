// Addresses of the "Add exercise" flow (decisions 031 and 032).
import { CATEGORIES, type Category } from '@/db/schema';

// The workout exercise page for an exercise that may not be in the workout yet.
export function logExerciseHref(exerciseId: string): string {
  return `/workout/exercise?exercise=${exerciseId}`;
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
