import { Suspense } from 'react';
import CalendarView from '@/components/history/CalendarView';

// The place in the calendar is in the address, which a static export only knows in the browser,
// so the view renders on the client inside Suspense.
export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarView />
    </Suspense>
  );
}
