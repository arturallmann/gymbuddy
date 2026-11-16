'use client';

import { useState } from 'react';
import { slideClass, tabAfter, tabDirection } from '@/lib/swipe';
import { useSwipe } from './useSwipe';

// The chosen tab of a page with tabs. A tap on a tab or a sideways swipe (decision 044) changes it,
// and the new panel slides in from the side of the tab it comes from (decision 045).
// Spread `swipe` on the page and give each panel `slide` as a class.
export function useTabs<T extends string>(tabs: { value: T }[], initial: T) {
  const [state, setState] = useState<{ tab: T; direction: -1 | 1 | null }>({ tab: initial, direction: null });
  const values = tabs.map((tab) => tab.value);
  const changeTab = (next: T) => {
    const direction = tabDirection(values, state.tab, next);
    if (direction) setState({ tab: next, direction });
  };
  const swipe = useSwipe((direction) => {
    const next = tabAfter(values, state.tab, direction);
    if (next) changeTab(next);
  });
  return { tab: state.tab, changeTab, swipe, slide: slideClass(state.direction) };
}
