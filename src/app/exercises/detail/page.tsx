import { Suspense } from 'react';
import ExerciseDetailView from '@/components/ExerciseDetailView';

// The id is in the address, which a static export only knows in the browser,
// so the view renders on the client inside Suspense.
export default function ExerciseDetailPage() {
  return (
    <Suspense>
      <ExerciseDetailView />
    </Suspense>
  );
}
