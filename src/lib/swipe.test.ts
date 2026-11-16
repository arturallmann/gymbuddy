import { describe, expect, test } from 'vitest';
import { slideClass, swipeDirection, tabAfter, tabDirection } from './swipe';

describe('swipeDirection', () => {
  test('read a swipe to the left as next and to the right as the one before', () => {
    expect(swipeDirection({ x: 300, y: 100 }, { x: 100, y: 110 })).toBe(1);
    expect(swipeDirection({ x: 100, y: 100 }, { x: 300, y: 90 })).toBe(-1);
  });

  test('ignore short moves and moves that go mostly down', () => {
    expect(swipeDirection({ x: 100, y: 100 }, { x: 150, y: 100 })).toBeNull();
    expect(swipeDirection({ x: 100, y: 100 }, { x: 200, y: 200 })).toBeNull();
  });
});

describe('tabAfter', () => {
  const tabs = ['progress', 'about', 'notes'];

  test('give the next tab or the one before', () => {
    expect(tabAfter(tabs, 'about', 1)).toBe('notes');
    expect(tabAfter(tabs, 'about', -1)).toBe('progress');
  });

  test('stop at either end', () => {
    expect(tabAfter(tabs, 'notes', 1)).toBeNull();
    expect(tabAfter(tabs, 'progress', -1)).toBeNull();
  });
});

describe('slide', () => {
  test('slide the next one in from the right and the one before from the left', () => {
    expect(slideClass(1)).toBe('slide-from-right');
    expect(slideClass(-1)).toBe('slide-from-left');
    expect(slideClass(null)).toBe('');
  });

  test('tell which way a tab change goes', () => {
    const tabs = ['progress', 'about', 'notes'];
    expect(tabDirection(tabs, 'progress', 'notes')).toBe(1);
    expect(tabDirection(tabs, 'notes', 'about')).toBe(-1);
    expect(tabDirection(tabs, 'about', 'about')).toBeNull();
  });
});
