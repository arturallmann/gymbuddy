// Addresses of the "Add exercise" flow (decision 031).

// The workout exercise page for an exercise that may not be in the workout yet.
export function logExerciseHref(exerciseId: string): string {
  return `/workout/exercise?exercise=${exerciseId}`;
}

// The exercises of one muscle group, to add to the workout.
export function muscleGroupHref(muscleGroupId: string): string {
  return `/workout/add/muscle?id=${muscleGroupId}`;
}
