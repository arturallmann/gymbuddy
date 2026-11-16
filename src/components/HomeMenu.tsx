'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useFeatures } from '@/hooks/useSettings';
import BookIcon from './icons/BookIcon';

// The book icon at the top of the home page (decision 035). It opens a menu with the workout
// history, statistics (statistics feature toggle, decision 043), exercises, routines and saved
// supersets. Routines need the templates feature toggle; saved supersets need the supersets and
// templates feature toggles.
export default function HomeMenu() {
  const features = useFeatures();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useBackHandler(open ? () => setOpen(false) : null);

  // A tap outside the menu closes it.
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const links = [
    { href: '/history', label: 'Workout history', shown: true },
    { href: '/statistics', label: 'Statistics', shown: features.statistics },
    { href: '/exercises', label: 'Exercises', shown: true },
    { href: '/routines', label: 'Routines', shown: features.templates },
    { href: '/saved-supersets', label: 'Saved supersets', shown: features.supersets && features.templates },
  ].filter((link) => link.shown);

  return (
    <div ref={menu} className="relative">
      <button
        type="button"
        aria-label="Exercises and routines"
        aria-expanded={open}
        aria-controls="home-menu"
        onClick={() => setOpen(!open)}
        className="rounded-lg p-2 text-link"
      >
        <BookIcon />
      </button>
      {open && (
        <nav
          id="home-menu"
          aria-label="Exercises and routines"
          className="absolute right-0 top-full z-20 mt-1 flex w-56 flex-col rounded-lg border bg-surface py-1 shadow-lg"
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="px-4 py-3 text-left">
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
