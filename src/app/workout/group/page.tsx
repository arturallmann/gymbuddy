import { Suspense } from 'react';
import GroupView from '@/components/GroupView';

// The id is in the address, which a static export only knows in the browser,
// so the view renders on the client inside Suspense.
export default function WorkoutGroupPage() {
  return (
    <Suspense>
      <GroupView />
    </Suspense>
  );
}
