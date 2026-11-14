// Sensors for dragging workout exercises (4b.1). A press on the drag handle starts a drag right
// away; a long press anywhere else on the card starts one too. A finger that moves before the long
// press is over scrolls the page instead.
import { PointerSensor, TouchSensor } from '@dnd-kit/core';
import type { PointerEvent } from 'react';

// Long press: how long the finger rests (ms) and how far it may move meanwhile (px).
export const LONG_PRESS = { delay: 300, tolerance: 8 };

// A pointer press that starts on an element marked with data-drag-handle.
export function startsOnHandle(event: Pick<globalThis.PointerEvent, 'isPrimary' | 'button' | 'target'>): boolean {
  return event.isPrimary && event.button === 0 && event.target instanceof Element && event.target.closest('[data-drag-handle]') !== null;
}

// Starts a drag at once, but only from the drag handle.
export class HandleSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent }: PointerEvent) => startsOnHandle(nativeEvent),
    },
  ];
}

// Starts a drag after a long press anywhere on the card.
export class LongPressSensor extends TouchSensor {}
