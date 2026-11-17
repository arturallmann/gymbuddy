'use client';

import { CATEGORIES, type Category } from '@/db/schema';
import { CATEGORY_LABELS } from '@/lib/exercises';

const OPTIONS: { value: Category | null; label: string }[] = [
  { value: null, label: 'All' },
  ...CATEGORIES.map((category) => ({ value: category, label: CATEGORY_LABELS[category] })),
];

// A row of chips that filters exercises by category. It scrolls sideways on a narrow phone.
export default function CategoryFilter({
  value,
  onChange,
}: {
  value: Category | null;
  onChange: (category: Category | null) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Category" className="-mx-6 flex gap-1.5 overflow-x-auto px-6">
      {OPTIONS.map((option) => (
        <button
          key={option.label}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
            option.value === value ? 'border-primary bg-primary text-on-primary' : 'bg-surface'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
