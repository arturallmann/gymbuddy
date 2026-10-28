# Gymbuddy

Gymbuddy is a gym tracker for phones that works offline.
You log workouts, exercises and sets, and all data stays in SQLite on the phone.

The app is in early development. See `docs/ROADMAP.md` for the current phase.

## Stack

- Next.js with static export (`output: 'export'`), React, TypeScript, Tailwind
- Capacitor wraps the static build as an Android and iOS app
- SQLite on the phone through Drizzle and `@capacitor-community/sqlite`

There is no server. The app must build as static files.

## Requirements

- Node.js 22 or newer
- For Android: Android Studio and JDK 21

## Commands

| Command | What it does |
|---|---|
| `npm ci` | Install dependencies |
| `npm run dev` | Start the dev server in the browser at http://localhost:3000 |
| `npm run typecheck` | Type check |
| `npm run lint` | Lint |
| `npm test` | Tests for helpers, database, components and pages (Vitest) |
| `npm run build` | Static build into `out/` |
| `npm run db:generate` | Generate a migration after changing `src/db/schema.ts` |
| `npx cap sync android` | Copy `out/` into the Android project |
| `npx cap open android` | Open the Android project in Android Studio |
| `npm run android` | Build, sync and install the app on a connected Android phone |

## Run on an Android phone

1. On the phone, turn on developer options and USB debugging, then connect it by USB.
2. Run `npm run android` and pick the phone from the list.

This needs the Android SDK and JDK 21 (both come with Android Studio).
You can also run `npm run build`, `npx cap sync android` and `npx cap open android`, then start the app from Android Studio.

The app loads the bundled files from `out/`, so the phone needs no connection to your computer.

## Docs

- `docs/ARCHITECTURE.md`: layers and data flow
- `docs/DATA_MODEL.md`: tables, units and weight rules
- `docs/DECISIONS.md`: decisions that are already made
- `docs/GLOSSARY.md`: the names used for things in code and the interface
- `docs/ROADMAP.md`: phases and tasks
- `docs/TESTING.md`: how to write and run tests
