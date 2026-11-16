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
        // Muscle map shades (decision 046): heat-0 untrained, heat-1 to heat-5 more and more trained.
        heat: {
          0: color('heat-0'),
          1: color('heat-1'),
          2: color('heat-2'),
          3: color('heat-3'),
          4: color('heat-4'),
          5: color('heat-5'),
        },
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
