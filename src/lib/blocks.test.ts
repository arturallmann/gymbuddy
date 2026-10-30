import { describe, expect, test } from 'vitest';
import { gatherIds, moveBlock, toBlocks } from './blocks';

const items = [
  { id: 'a', groupId: null },
  { id: 'b', groupId: 'g' },
  { id: 'c', groupId: 'g' },
  { id: 'd', groupId: null },
];

describe('toBlocks', () => {
  test('put neighbours of one group into one block', () => {
    expect(toBlocks(items).map((block) => (block.kind === 'single' ? block.item.id : block.items.map((i) => i.id)))).toEqual([
      'a',
      ['b', 'c'],
      'd',
    ]);
  });
});

describe('moveBlock', () => {
  test('move a group as a whole, from any of its members', () => {
    expect(moveBlock(items, 'c', 'up')).toEqual(['b', 'c', 'a', 'd']);
    expect(moveBlock(items, 'b', 'down')).toEqual(['a', 'd', 'b', 'c']);
  });

  test('move a single exercise past a whole group', () => {
    expect(moveBlock(items, 'd', 'up')).toEqual(['a', 'd', 'b', 'c']);
  });

  test('keep the order at the top and the bottom', () => {
    expect(moveBlock(items, 'a', 'up')).toEqual(['a', 'b', 'c', 'd']);
    expect(moveBlock(items, 'd', 'down')).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('gatherIds', () => {
  test('move the chosen items to the first one, in their current order', () => {
    const list = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, groupId: null }));
    expect(gatherIds(list, ['d', 'b'])).toEqual(['a', 'b', 'd', 'c', 'e']);
    expect(gatherIds(list, ['a', 'e'])).toEqual(['a', 'e', 'b', 'c', 'd']);
  });
});
