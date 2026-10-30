// Rounds of an exercise group: round N is set N of every member (docs/DATA_MODEL.md, supersets).

// One row per round, one cell per member. A member without that set yet has null.
export function roundRows<T>(setsPerMember: T[][]): (T | null)[][] {
  const rounds = Math.max(0, ...setsPerMember.map((list) => list.length));
  return Array.from({ length: rounds }, (_, round) => setsPerMember.map((list) => list[round] ?? null));
}

// Which member logs next in guided order (A → B → … → rest → A): the first member with the
// fewest sets. So after a round every member has the same number of sets.
export function nextMemberIndex(setCounts: number[]): number {
  const fewest = Math.min(...setCounts);
  return setCounts.indexOf(fewest);
}

// True when the counts close a round: every member has the same number of sets, and at least one.
export function roundComplete(setCounts: number[]): boolean {
  return setCounts.length > 0 && setCounts[0] > 0 && setCounts.every((count) => count === setCounts[0]);
}
