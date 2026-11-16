'use client';

import { tabAfter } from '@/lib/swipe';
import { useSwipe } from './useSwipe';

// Swipe left for the next tab and right for the one before (decision 044).
export function useTabSwipe<T extends string>(tabs: { value: T }[], value: T, onChange: (value: T) => void) {
  return useSwipe((direction) => {
    const next = tabAfter(
      tabs.map((tab) => tab.value),
      value,
      direction,
    );
    if (next) onChange(next);
  });
}
