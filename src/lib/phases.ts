// Workout phases: warm-up phase, main phase and cool-down phase. See docs/DATA_MODEL.md.
import { PHASES, type Category, type Phase } from '@/db/schema';

export const PHASE_LABELS: Record<Phase, string> = {
  warmup: 'Warm-up phase',
  main: 'Main phase',
  cooldown: 'Cool-down phase',
};

// Stretches normally go in the cool-down phase. Without the phases feature toggle,
// every new workout exercise goes in the main phase.
export function defaultPhase(category: Category, phasesOn: boolean): Phase {
  return phasesOn && category === 'stretch' ? 'cooldown' : 'main';
}

// The items in phase order, keeping their order inside each phase. Empty phases are left out.
export function groupByPhase<T extends { phase: Phase }>(items: T[]): { phase: Phase; items: T[] }[] {
  return PHASES.map((phase) => ({ phase, items: items.filter((item) => item.phase === phase) })).filter(
    (group) => group.items.length > 0,
  );
}
