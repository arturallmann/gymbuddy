import { Suspense } from 'react';
import AddExerciseView from '@/components/AddExerciseView';

// The category filter is in the address, which a static export only knows in the browser,
// so the view renders on the client inside Suspense.
export default function Page() {
  return (
    <Suspense>
      <AddExerciseView />
    </Suspense>
  );
}
