'use client';

import { useNow } from '@/hooks/useNow';
import { formatDuration } from '@/lib/units';

// Time since `since`, such as "12:05" or "1:02:03". Counts up every second.
export default function ElapsedTime({ since }: { since: Date }) {
  const now = useNow();
  return <span className="tabular-nums">{formatDuration((now.getTime() - since.getTime()) / 1000)}</span>;
}
