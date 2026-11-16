// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { startsOnHandle } from './dragSensors';

describe('startsOnHandle', () => {
  const card = document.createElement('li');
  const handle = document.createElement('span');
  handle.dataset.dragHandle = '';
  const grip = document.createElement('svg');
  handle.append(grip);
  const text = document.createElement('a');
  card.append(text, handle);

  test('start on the handle or anything inside it', () => {
    expect(startsOnHandle({ isPrimary: true, button: 0, target: handle })).toBe(true);
    expect(startsOnHandle({ isPrimary: true, button: 0, target: grip })).toBe(true);
  });

  test('not on the rest of the card, a second finger or another mouse button', () => {
    expect(startsOnHandle({ isPrimary: true, button: 0, target: text })).toBe(false);
    expect(startsOnHandle({ isPrimary: false, button: 0, target: handle })).toBe(false);
    expect(startsOnHandle({ isPrimary: true, button: 2, target: handle })).toBe(false);
  });
});
