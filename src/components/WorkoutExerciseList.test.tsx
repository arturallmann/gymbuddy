import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import WorkoutExerciseList from './WorkoutExerciseList';

const exercise = {
  loadType: 'external',
  tracksReps: true,
  tracksDuration: false,
  tracksDistance: false,
  category: 'strength',
  defaultDurationSeconds: null,
  phase: 'main',
  groupId: null,
} as const;
const items = [
  { id: 'a', exerciseId: 'x', name: 'Squat', position: 1, ...exercise },
  { id: 'b', exerciseId: 'y', name: 'Row', position: 2, ...exercise },
];

test('show the workout exercises in order', () => {
  render(<WorkoutExerciseList items={items} onMove={vi.fn()} onRemove={vi.fn()} />);

  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    expect.stringContaining('Squat'),
    expect.stringContaining('Row'),
  ]);
});

test('turn off moving the first up and the last down', () => {
  render(<WorkoutExerciseList items={items} onMove={vi.fn()} onRemove={vi.fn()} />);

  expect(screen.getByRole('button', { name: 'Move Squat up' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move Squat down' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Move Row up' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Move Row down' })).toBeDisabled();
});

test('report moves and removals', async () => {
  const user = userEvent.setup();
  const onMove = vi.fn();
  const onRemove = vi.fn();
  render(<WorkoutExerciseList items={items} onMove={onMove} onRemove={onRemove} />);

  await user.click(screen.getByRole('button', { name: 'Move Row up' }));
  await user.click(screen.getByRole('button', { name: 'Remove Squat' }));

  expect(onMove).toHaveBeenCalledWith('b', 'up');
  expect(onRemove).toHaveBeenCalledWith('a');
});

test('link each workout exercise to its own page', () => {
  render(<WorkoutExerciseList items={items} onMove={vi.fn()} onRemove={vi.fn()} />);

  expect(screen.getByRole('link', { name: /Squat/ })).toHaveAttribute('href', '/workout/exercise?id=a');
  expect(screen.getByRole('link', { name: /Row/ })).toHaveAttribute('href', '/workout/exercise?id=b');
});

describe('exercise groups', () => {
  const grouped = [
    { ...items[0], id: 'a', name: 'Squat', groupId: null },
    { ...items[0], id: 'b', name: 'Curl', groupId: 'g' },
    { ...items[0], id: 'c', name: 'Press', groupId: 'g' },
  ];

  test('show a group as one card that links to the group page and moves as a whole', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const onUngroup = vi.fn();
    render(
      <WorkoutExerciseList
        items={grouped}
        onMove={onMove}
        onRemove={vi.fn()}
        onUngroup={onUngroup}
        renderGroup={(members) => <span>Rounds of {members.length}</span>}
      />,
    );

    const card = screen.getByRole('listitem', { name: 'Superset: Curl + Press' });
    expect(within(card).getByRole('link', { name: 'Rounds of 2' })).toHaveAttribute('href', '/workout/group?id=g');
    expect(within(card).getByRole('button', { name: 'Move Curl + Press down' })).toBeDisabled();
    await user.click(within(card).getByRole('button', { name: 'Move Curl + Press up' }));
    expect(onMove).toHaveBeenCalledWith('b', 'up');
    await user.click(within(card).getByRole('button', { name: 'Ungroup' }));
    expect(onUngroup).toHaveBeenCalledWith('g');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  test('show no Ungroup without onUngroup', () => {
    render(<WorkoutExerciseList items={grouped} onMove={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Ungroup' })).not.toBeInTheDocument();
  });

  test('let the user choose single workout exercises while choosing for a superset', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <WorkoutExerciseList
        items={[...grouped, { ...items[0], id: 'd', name: 'Row', groupId: null }]}
        onMove={vi.fn()}
        onRemove={vi.fn()}
        selection={{ chosen: ['a'], onToggle, canChoose: (item) => item.id !== 'd' }}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Squat' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Row' })).toBeDisabled();
    expect(screen.queryByRole('checkbox', { name: /Curl/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Squat' }));
    expect(onToggle).toHaveBeenCalledWith('a');
  });
});
