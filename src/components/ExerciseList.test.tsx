import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import type { ExerciseListItem } from '@/db/exercises';
import ExerciseList from './ExerciseList';

const curl = {
  id: 'e1',
  name: 'Barbell Curl',
  category: 'strength',
  equipment: 'barbell',
  imagePath: 'Barbell_Curl/0.jpg',
} as ExerciseListItem;

test('show name, category and equipment, linked to the exercise page', () => {
  render(<ExerciseList items={[curl]} showImages />);

  const link = screen.getByRole('link', { name: /Barbell Curl/ });
  expect(link).toHaveAttribute('href', '/exercises/detail?id=e1');
  expect(link).toHaveTextContent('Strength · Barbell');
  expect(link.querySelector('img')?.getAttribute('src')).toContain('Barbell_Curl');
});

test('show no images when they are turned off', () => {
  render(<ExerciseList items={[curl]} showImages={false} />);

  expect(screen.getByRole('link', { name: /Barbell Curl/ }).querySelector('img')).toBeNull();
});
