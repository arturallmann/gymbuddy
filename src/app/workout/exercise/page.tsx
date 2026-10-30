import { Suspense } from 'react';
import WorkoutExerciseView from '@/components/WorkoutExerciseView';

// The id is in the address, which a static export only knows in the browser,
// so the view renders on the client inside Suspense.
export default function WorkoutExercisePage() {
  return (
    <Suspense>
      <WorkoutExerciseView />
    </Suspense>
  );
}
