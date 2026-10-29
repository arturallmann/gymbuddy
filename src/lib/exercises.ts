// Display helpers for exercises. Pure functions: no database, no React.
import type { Category } from '@/db/schema';

// Where the bundled image lives in the app: "3_4_Sit-Up/0.jpg" → "/exercise-images/3_4_Sit-Up/0.jpg".
export function exerciseImageUrl(path: string): string {
  return `/exercise-images/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  stretch: 'Stretch',
  mobility: 'Mobility',
};

// "body only" → "Body only". The library stores equipment in lower case.
export function equipmentLabel(equipment: string): string {
  return equipment.charAt(0).toUpperCase() + equipment.slice(1);
}

// The library stores instructions as one step per line.
export function instructionSteps(instructions: string | null): string[] {
  return (instructions ?? '')
    .split('\n')
    .map((step) => step.trim())
    .filter((step) => step.length > 0);
}
