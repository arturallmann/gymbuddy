import type { Theme } from '@/db/schema';

// Shows the theme on the page: "light" and "dark" write data-theme on <html>, which picks the
// colors in globals.css. "system" removes it, so the phone's light or dark mode decides.
export function applyTheme(theme: Theme, root: HTMLElement): void {
  if (theme === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
}
