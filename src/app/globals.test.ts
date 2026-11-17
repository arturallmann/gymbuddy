import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const css = readFileSync(join(__dirname, 'globals.css'), 'utf8');

// Android's tap highlight is a rectangle, so rounded buttons lit up at their corners.
test('turn off the tap highlight and give buttons and links a pressed state instead', () => {
  expect(css).toMatch(/\*\s*\{\s*-webkit-tap-highlight-color:\s*transparent;/);
  expect(css).toMatch(/button,\s*\[role='button'\]\s*\{\s*-webkit-user-select:\s*none;\s*user-select:\s*none;/);
  expect(css).toMatch(/button:not\(:disabled\):active,\s*a:active,\s*\[role='button'\]:active\s*\{\s*filter:/);
});

test('slide content in from either side, and not at all with reduced motion (decision 045)', () => {
  expect(css).toMatch(/\.slide-from-right\s*\{\s*animation: slide-from-right/);
  expect(css).toMatch(/\.slide-from-left\s*\{\s*animation: slide-from-left/);
  expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.slide-from-right,\s*\.slide-from-left\s*\{\s*animation: none/);
});

// 5.2.5: holding the + on the workout page picked it up as a draggable link.
test('never let a long press drag a link or image, or open the link menu', () => {
  expect(css).toMatch(/a,\s*img\s*\{\s*-webkit-user-drag:\s*none;\s*-webkit-touch-callout:\s*none;/);
  expect(css).toMatch(/\ba\s*\{\s*-webkit-user-select:\s*none;\s*user-select:\s*none;/);
});
