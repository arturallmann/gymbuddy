import { Suspense } from 'react';
import MuscleGroupExercises from '@/components/workout/MuscleGroupExercises';

// The id is in the address, which a static export only knows in the browser,
// so the view renders on the client inside Suspense.
export default function Page() {
  return (
    <Suspense>
      <MuscleGroupExercises />
    </Suspense>
  );
}
