import { expect, test } from 'vitest';
import { defaultPhase, groupByPhase } from './phases';

test('put stretches in the cool-down phase only when phases are on', () => {
  expect(defaultPhase('stretch', true)).toBe('cooldown');
  expect(defaultPhase('strength', true)).toBe('main');
  expect(defaultPhase('stretch', false)).toBe('main');
});

test('group items by phase in phase order and keep their order', () => {
  const items = [
    { name: 'Stretch', phase: 'cooldown' as const },
    { name: 'Squat', phase: 'main' as const },
    { name: 'Jog', phase: 'warmup' as const },
    { name: 'Row', phase: 'main' as const },
  ];
  expect(groupByPhase(items).map((group) => [group.phase, group.items.map((item) => item.name)])).toEqual([
    ['warmup', ['Jog']],
    ['main', ['Squat', 'Row']],
    ['cooldown', ['Stretch']],
  ]);
  expect(groupByPhase([])).toEqual([]);
});
