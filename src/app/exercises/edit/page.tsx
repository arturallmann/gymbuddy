import { Suspense } from 'react';
import CustomExerciseEditor from '@/components/CustomExerciseEditor';

// The id is in the address, which a static export only knows in the browser,
// so the editor renders on the client inside Suspense.
export default function CustomExerciseEditPage() {
  return (
    <Suspense>
      <CustomExerciseEditor />
    </Suspense>
  );
}
