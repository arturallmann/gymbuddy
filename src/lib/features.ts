// Feature toggles and presets. See docs/DATA_MODEL.md.
import { DEFAULT_FEATURES, type FeatureToggles, type Preset } from '@/db/schema';

export type FeatureName = keyof FeatureToggles;

// The presets offered at first-time setup. "custom" has no fixed toggles.
export const PRESET_FEATURES: Record<Exclude<Preset, 'custom'>, FeatureToggles> = {
  simple: {
    restTimer: false,
    supersets: false,
    templates: false,
    rpe: false,
    setTypes: false,
    phases: false,
    setNotes: false,
    exerciseImages: true,
    charts: true,
  },
  standard: {
    restTimer: true,
    supersets: true,
    templates: true,
    rpe: false,
    setTypes: false,
    phases: false,
    setNotes: true,
    exerciseImages: true,
    charts: true,
  },
  advanced: {
    restTimer: true,
    supersets: true,
    templates: true,
    rpe: true,
    setTypes: true,
    phases: true,
    setNotes: true,
    exerciseImages: true,
    charts: true,
  },
};

// Interface text for each feature toggle, in display order.
export const FEATURES: { name: FeatureName; label: string; description: string }[] = [
  { name: 'restTimer', label: 'Rest timer', description: 'Count down the rest between sets.' },
  { name: 'supersets', label: 'Supersets', description: 'Group exercises into supersets.' },
  {
    name: 'templates',
    label: 'Routines and saved supersets',
    description: 'Save workouts and supersets to reuse them.',
  },
  { name: 'rpe', label: 'RPE', description: 'Rate how hard each set felt.' },
  {
    name: 'setTypes',
    label: 'Set types',
    description: 'Mark warm-up sets, drop sets and failure sets.',
  },
  {
    name: 'phases',
    label: 'Warm-up phase and cool-down phase',
    description: 'Split a workout into phases, with a stretch timer.',
  },
  { name: 'setNotes', label: 'Notes on sets', description: 'Write notes on each set.' },
  { name: 'exerciseImages', label: 'Exercise images', description: 'Show images in the exercise browser.' },
  { name: 'charts', label: 'Chart view', description: 'Show progress charts. The history view stays.' },
];

export const PRESET_LABELS: Record<Preset, string> = {
  simple: 'Simple',
  standard: 'Standard',
  advanced: 'Advanced',
  custom: 'Custom',
};

// Stored toggles merged over the defaults, so a new toggle needs no migration.
export function resolveFeatures(stored: Partial<FeatureToggles>): FeatureToggles {
  return { ...DEFAULT_FEATURES, ...stored };
}
