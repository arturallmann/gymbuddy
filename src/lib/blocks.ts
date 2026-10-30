// Blocks of a workout: a single workout exercise, or the members of one exercise group.
// Members of a group sit next to each other (docs/DATA_MODEL.md, supersets).

type Groupable = { id: string; groupId: string | null };

export type Block<T extends Groupable> =
  | { kind: 'single'; item: T }
  | { kind: 'group'; groupId: string; items: T[] };

// Splits a list in position order into blocks. Neighbours with the same group id form one block.
export function toBlocks<T extends Groupable>(items: T[]): Block<T>[] {
  const blocks: Block<T>[] = [];
  for (const item of items) {
    const last = blocks.at(-1);
    if (item.groupId && last?.kind === 'group' && last.groupId === item.groupId) {
      last.items.push(item);
    } else if (item.groupId) {
      blocks.push({ kind: 'group', groupId: item.groupId, items: [item] });
    } else {
      blocks.push({ kind: 'single', item });
    }
  }
  return blocks;
}

const idsOf = <T extends Groupable>(block: Block<T>) => (block.kind === 'single' ? [block.item.id] : block.items.map((item) => item.id));

// The new id order after moving the block that holds `id` one block up or down.
// A group moves as a whole, so its members stay together. Unchanged at the top or bottom.
export function moveBlock<T extends Groupable>(items: T[], id: string, direction: 'up' | 'down'): string[] {
  const blocks = toBlocks(items);
  const index = blocks.findIndex((block) => idsOf(block).includes(id));
  const other = direction === 'up' ? index - 1 : index + 1;
  if (index >= 0 && other >= 0 && other < blocks.length) {
    [blocks[index], blocks[other]] = [blocks[other], blocks[index]];
  }
  return blocks.flatMap(idsOf);
}

// The new id order when the chosen items become one group: they move to where the first
// chosen item is, in their current order, and everything else keeps its order.
export function gatherIds<T extends Groupable>(items: T[], chosen: string[]): string[] {
  const picked = items.filter((item) => chosen.includes(item.id)).map((item) => item.id);
  const order: string[] = [];
  for (const item of items) {
    if (!chosen.includes(item.id)) order.push(item.id);
    else if (item.id === picked[0]) order.push(...picked);
  }
  return order;
}
