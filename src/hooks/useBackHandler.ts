'use client';

import { useEffect, useRef } from 'react';
import { backStack, type BackKind } from '@/lib/backStack';

// While `handler` is not null, Android Back runs it (see src/lib/backStack.ts).
// Use 'close' for something open on the page, such as a confirm step, and 'page' for
// going to the page before.
export function useBackHandler(handler: (() => void) | null, kind: BackKind = 'close') {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  const active = handler !== null;
  useEffect(() => {
    if (!active) return;
    return backStack.register(kind, () => latest.current?.());
  }, [active, kind]);
}
