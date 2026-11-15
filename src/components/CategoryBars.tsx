import type { Category } from '@/db/schema';

// Plate colors per category (decision 040): strength petrol, cardio yellow, stretch green, mobility grey.
const COLOR: Record<Category, string> = {
  strength: 'bg-link',
  cardio: 'bg-accent',
  stretch: 'bg-success',
  mobility: 'bg-muted',
};

// Small bars that show which categories a day's workouts had. A day whose workouts have no exercises
// still gets one grey bar (`hasWorkout`), so every workout day is marked. The day's label names them
// for screen readers, so the bars themselves are hidden from them.
export default function CategoryBars({ categories, hasWorkout = false }: { categories: Category[]; hasWorkout?: boolean }) {
  return (
    <span aria-hidden className="flex h-1 gap-0.5">
      {categories.map((category) => (
        <i key={category} data-category={category} className={`block h-1 w-2.5 rounded-sm ${COLOR[category]}`} />
      ))}
      {categories.length === 0 && hasWorkout && <i data-category="none" className="block h-1 w-2.5 rounded-sm bg-line-strong" />}
    </span>
  );
}
