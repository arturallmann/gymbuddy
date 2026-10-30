import { Suspense } from 'react';
import WorkoutDetail from '@/components/WorkoutDetail';

// The id is in the address, which a static export only knows in the browser,
// so the detail renders on the client inside Suspense.
export default function WorkoutDetailPage() {
  return (
    <Suspense>
      <WorkoutDetail />
    </Suspense>
  );
}
