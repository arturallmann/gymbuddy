import { screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithDatabase } from '@/testing/render';
import MuscleGroupCard from './MuscleGroupCard';

const glutes = { id: 'g1', key: 'glutes', name: 'Glutes', primarySets: 2, secondarySets: 0, volume: 20000, exercises: ['Glute Kickback'] };
const scrollIntoView = vi.fn();

// The card as the muscle map uses it: a tap chooses a muscle group.
function Chooser() {
  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);
  return (
    <>
      <button type="button" onClick={() => setMuscleGroup('glutes')}>Glutes</button>
      <button type="button" onClick={() => setMuscleGroup('lats')}>Lats</button>
      <MuscleGroupCard muscleGroup={muscleGroup} summary={muscleGroup === 'glutes' ? glutes : undefined} weeks={1} emptyText="No sets." />
    </>
  );
}

beforeEach(() => {
  // jsdom has no layout, so it has no scrollIntoView.
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  scrollIntoView.mockReset();
});

test('scroll the chosen muscle group into view, only as far as needed (5.2.4)', async () => {
  const { user } = await renderWithDatabase(<Chooser />);
  expect(screen.getByText('Tap a muscle group to see its sets and exercises.')).toBeInTheDocument();
  expect(scrollIntoView).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Glutes' }));

  expect(await screen.findByRole('region', { name: 'Glutes' })).toHaveTextContent('Glute Kickback');
  expect(scrollIntoView).toHaveBeenCalledTimes(1);
  expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'nearest' }));
});

test('scroll again when another muscle group is chosen', async () => {
  const { user } = await renderWithDatabase(<Chooser />);
  await user.click(screen.getByRole('button', { name: 'Glutes' }));
  await user.click(screen.getByRole('button', { name: 'Lats' }));

  expect(await screen.findByText('No sets.')).toBeInTheDocument();
  expect(scrollIntoView).toHaveBeenCalledTimes(2);
});
