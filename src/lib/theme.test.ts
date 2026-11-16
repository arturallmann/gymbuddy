// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { applyTheme } from './theme';

describe('applyTheme', () => {
  test('write light or dark on the root element', () => {
    const root = document.createElement('html');
    applyTheme('dark', root);
    expect(root.dataset.theme).toBe('dark');
    applyTheme('light', root);
    expect(root.dataset.theme).toBe('light');
  });

  test('remove the theme for system, so the phone decides', () => {
    const root = document.createElement('html');
    applyTheme('dark', root);
    applyTheme('system', root);
    expect(root.hasAttribute('data-theme')).toBe(false);
  });
});
