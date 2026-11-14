import type { Config } from 'tailwindcss'

// The named colors of the color theme (decision 030). Their values live in src/app/globals.css,
// one set for the light theme and one for the dark theme.
const color = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        page: color('page'),
        surface: color('surface'),
        line: color('line'),
        'line-strong': color('line-strong'),
        ink: color('ink'),
        muted: color('muted'),
        primary: color('primary'),
        'on-primary': color('on-primary'),
        link: color('link'),
        accent: color('accent'),
        'on-accent': color('on-accent'),
        danger: color('danger'),
        'on-danger': color('on-danger'),
        success: color('success'),
      },
      // A plain `border` uses the strong border color, so cards and buttons stay visible.
      borderColor: {
        DEFAULT: color('line-strong'),
      },
    },
  },
  plugins: [],
}
export default config
