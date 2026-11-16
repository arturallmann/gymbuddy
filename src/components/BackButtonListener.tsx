'use client';

import { useEffect } from 'react';
import { backStack } from '@/lib/backStack';
import { exitApp, onBackButton } from '@/native/app';

// Catches Android Back once for the whole app (4b.2): it closes what is open, goes to the page
// before, and closes the app only when neither applies, which is on the home page.
export default function BackButtonListener() {
  useEffect(
    () =>
      onBackButton(() => {
        if (!backStack.back()) exitApp();
      }),
    [],
  );
  return null;
}
