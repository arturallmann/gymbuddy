import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import CategoryBars from './CategoryBars';

test('draw one bar per category in its plate color, hidden from screen readers', () => {
  const { container } = render(<CategoryBars categories={['strength', 'cardio', 'stretch', 'mobility']} />);

  const bars = [...container.querySelectorAll('i')];
  expect(bars.map((bar) => bar.className.match(/bg-\S+/)?.[0])).toEqual(['bg-link', 'bg-accent', 'bg-success', 'bg-muted']);
  expect(container.firstElementChild).toHaveAttribute('aria-hidden');
});

test('mark a workout day without exercises with one grey bar', () => {
  const { container } = render(<CategoryBars categories={[]} hasWorkout />);
  expect([...container.querySelectorAll('i')].map((bar) => bar.getAttribute('data-category'))).toEqual(['none']);

  const { container: empty } = render(<CategoryBars categories={[]} />);
  expect(empty.querySelectorAll('i')).toHaveLength(0);
});
