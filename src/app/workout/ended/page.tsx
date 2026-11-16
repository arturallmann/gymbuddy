import { Suspense } from 'react';
import WorkoutEndedView from '@/components/WorkoutEndedView';

// The id is in the address, which a static export only knows in the browser.
export default function WorkoutEndedPage() {
  return (
    <Suspense>
      <WorkoutEndedView />
    </Suspense>
  );
}
