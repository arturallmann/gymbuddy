'use client';

import Link from 'next/link';
import { useFeatures } from '@/hooks/useSettings';

// The home page link to the routines, shown when the templates feature toggle is on.
export default function RoutinesLink() {
  const features = useFeatures();
  if (!features.templates) {
    return null;
  }
  return (
    <Link href="/routines" className="text-sky-600">
      Routines
    </Link>
  );
}
