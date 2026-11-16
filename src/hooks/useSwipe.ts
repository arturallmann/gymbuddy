'use client';

import { useRef, type TouchEvent } from 'react';
import { swipeDirection } from '@/lib/swipe';

// A swipe that starts in a text field or in something that scrolls sideways belongs to that element.
function ownsSwipe(target: EventTarget | null): boolean {
  for (let node = target instanceof Element ? target : null; node; node = node.parentElement) {
    if (node.matches('input, textarea, select')) return true;
    const overflow = getComputedStyle(node).overflowX;
    if ((overflow === 'auto' || overflow === 'scroll') && node.scrollWidth > node.clientWidth) return true;
  }
  return false;
}

// Touch handlers that call `onSwipe(1)` for a swipe to the left and `onSwipe(-1)` to the right.
// Spread them on the element that should react: `<main {...useSwipe(...)}>`.
export function useSwipe(onSwipe: (direction: -1 | 1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (event: TouchEvent) => {
      const point = event.touches[0];
      start.current = point && event.touches.length === 1 && !ownsSwipe(event.target) ? { x: point.clientX, y: point.clientY } : null;
    },
    onTouchEnd: (event: TouchEvent) => {
      const from = start.current;
      const point = event.changedTouches[0];
      start.current = null;
      if (!from || !point) return;
      const direction = swipeDirection(from, { x: point.clientX, y: point.clientY });
      if (direction) onSwipe(direction);
    },
  };
}
