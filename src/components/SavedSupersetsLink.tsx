'use client';

import Link from 'next/link';
import { useFeatures } from '@/hooks/useSettings';

// The home page link to the saved supersets, shown when supersets and templates are both on (decision 026).
export default function SavedSupersetsLink() {
  const features = useFeatures();
  if (!features.supersets || !features.templates) {
    return null;
  }
  return (
    <Link href="/saved-supersets" className="text-sky-600">
      Saved supersets
    </Link>
  );
}
