// Addresses of the exercise browser (/exercises) and its exercise pages.
import type { Category } from '@/db/schema';
import { parseCategory } from './addExercise';

export type BrowserFilter = {
  query: string;
  muscleGroupId: string;
  category: Category | null;
  customOnly: boolean;
};

// The exercise browser with its search and filters, so an exercise page can return to them.
export function exerciseBrowserHref(filter: BrowserFilter): string {
  const params = new URLSearchParams();
  if (filter.query) params.set('q', filter.query);
  if (filter.muscleGroupId) params.set('muscle', filter.muscleGroupId);
  if (filter.category) params.set('category', filter.category);
  if (filter.customOnly) params.set('custom', '1');
  const query = params.toString();
  return query ? `/exercises?${query}` : '/exercises';
}

// The search and filters in an exercise browser address.
export function parseBrowserFilter(params: URLSearchParams): BrowserFilter {
  return {
    query: params.get('q') ?? '',
    muscleGroupId: params.get('muscle') ?? '',
    category: parseCategory(params.get('category')),
    customOnly: params.get('custom') === '1',
  };
}

// An exercise page. `back` is the exercise browser address it was opened from.
export function exerciseDetailHref(exerciseId: string, back: string | null = null): string {
  return `/exercises/detail?id=${exerciseId}${back ? `&back=${encodeURIComponent(back)}` : ''}`;
}

// Where the back arrow of an exercise page goes: the exercise browser address in the address,
// otherwise the exercise browser without filters. Only exercise browser addresses count.
export function exerciseDetailBack(back: string | null): string {
  return back === '/exercises' || back?.startsWith('/exercises?') ? back : '/exercises';
}
