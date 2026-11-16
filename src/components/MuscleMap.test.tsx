import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import MuscleMap from './MuscleMap';

function Map_({ values }: { values: Map<string, number> }) {
  const [selected, setSelected] = useState<string | null>(null);
  return <MuscleMap values={values} format={(v) => `${v} sets`} selected={selected} onSelect={setSelected} />;
}

const values = new Map([
  ['chest', 10],
  ['triceps', 4],
]);

test('shade each muscle group by its value, the darkest for the most trained one', () => {
  render(<Map_ values={values} />);

  expect(screen.getByRole('button', { name: 'Chest, 10 sets' })).toHaveClass('fill-heat-5');
  expect(screen.getByRole('button', { name: 'Triceps, 4 sets' })).toHaveClass('fill-heat-2');
  expect(screen.getByRole('button', { name: 'Quadriceps, 0 sets' })).toHaveClass('fill-heat-0');
  expect(screen.getByRole('group', { name: 'Front of the body' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Back of the body' })).toBeInTheDocument();
});

test('offer each muscle group once to screen readers, though both sides of the body are drawn', () => {
  render(<Map_ values={values} />);

  expect(screen.getAllByRole('button', { name: /^Chest/ })).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: /^Shoulders/ })).toHaveLength(2); // front and back
});

test('choose a muscle group with a tap or Enter, and clear it with a second tap', async () => {
  const user = userEvent.setup();
  render(<Map_ values={values} />);
  const chest = screen.getByRole('button', { name: 'Chest, 10 sets' });

  await user.click(chest);
  expect(chest).toHaveAttribute('aria-pressed', 'true');
  await user.click(chest);
  expect(chest).toHaveAttribute('aria-pressed', 'false');

  const triceps = screen.getByRole('button', { name: 'Triceps, 4 sets' });
  fireEvent.keyDown(triceps, { key: 'Enter' });
  expect(triceps).toHaveAttribute('aria-pressed', 'true');
});

test('take taps next to small muscle groups too, through a wider invisible tap area', async () => {
  const user = userEvent.setup();
  const { container } = render(<Map_ values={values} />);
  const areas = (key: string) => container.querySelectorAll(`[data-tap-area="${key}"]`);

  // Front and back, each on both sides of the body (the back traps sit on the center line).
  expect(areas('adductors')).toHaveLength(4);
  expect(areas('abductors')).toHaveLength(4);
  expect(areas('traps')).toHaveLength(3);
  expect(areas('chest')).toHaveLength(0);
  expect(areas('traps')[0]).toHaveAttribute('stroke-width', '14');

  await user.click(areas('traps')[0]);
  for (const traps of screen.getAllByRole('button', { name: 'Traps, 0 sets' })) expect(traps).toHaveAttribute('aria-pressed', 'true');
});
