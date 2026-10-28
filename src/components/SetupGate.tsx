'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSettings } from '@/hooks/useSettings';

const SETUP_PATH = '/setup';

// Shows first-time setup once, before any other page.
export default function SetupGate({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const pathname = usePathname();
  const router = useRouter();
  const done = settings.setupCompletedAt !== null;
  const onSetup = pathname === SETUP_PATH;
  const redirect = done === onSetup ? (done ? '/' : SETUP_PATH) : null;

  useEffect(() => {
    if (redirect) {
      router.replace(redirect);
    }
  }, [redirect, router]);

  return redirect ? null : children;
}
