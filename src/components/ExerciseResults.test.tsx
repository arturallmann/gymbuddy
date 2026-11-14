import { render, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import type { ExerciseListItem } from '@/db/exercises';
import ExerciseResults from './ExerciseResults';

const exercise = (name: string) =>
  ({ id: name, name, category: 'strength', equipment: 'barbell', imagePath: null }) as ExerciseListItem;
const items = ['Barbell Full Squat', 'Barbell Squat', 'Goblet Squat'].map(exercise);

test('show done exercises first under Done before, with how often, then all others', () => {
  const use = new Map([
    ['Goblet Squat', { workouts: 1, lastAt: new Date(2026, 10, 14) }],
    ['Barbell Squat', { workouts: 12, lastAt: new Date(2026, 10, 12) }],
  ]);
  render(<ExerciseResults items={items} use={use} showImages={false} />);

  const done = within(screen.getByRole('region', { name: 'Done before' })).getAllByRole('link');
  expect(done.map((link) => link.textContent)).toEqual([
    'Barbell SquatStrength · Barbell · 12 workouts',
    'Goblet SquatStrength · Barbell · 1 workout',
  ]);
  const all = within(screen.getByRole('region', { name: 'All exercises' })).getAllByRole('link');
  expect(all.map((link) => link.textContent)).toEqual(['Barbell Full SquatStrength · Barbell']);
});

test('show one plain list when nothing was done', () => {
  render(<ExerciseResults items={items} use={new Map()} showImages={false} />);

  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  expect(screen.getAllByRole('link')).toHaveLength(3);
});
