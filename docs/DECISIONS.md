# Decisions

Each entry records one decision and the reason. Add new entries at the bottom. Do not rewrite old entries; add a new entry that replaces them.

## 001 — Capacitor stays as the native shell
Date: 2026-10-28
The app is built from web code. A rewrite in React Native, Flutter or native code costs months.
A gym tracker shows forms, lists and timers. A web view handles these screens well.

## 002 — All data lives on the phone
Date: 2026-10-28
The app must work in gyms with weak signal. No feature may need a server to log a workout.

## 003 — Drizzle replaces Prisma
Date: 2026-10-28
Prisma needs Node.js and cannot run inside the phone's web view.
Drizzle runs on the phone through a Capacitor SQLite plugin and defines the schema in TypeScript.

## 004 — Next.js uses static export
Date: 2026-10-28
Capacitor loads static files from the app package. So the build uses `output: 'export'`.
API routes, server actions and server rendering are not allowed.

## 005 — Units are grams, seconds and meters
Date: 2026-10-28
Integers avoid rounding errors with 1.25 kg plates. The interface converts for display.

## 006 — Bodyweight exercises store added weight only
Date: 2026-10-28
The user logs "BW + 5 kg", not their bodyweight plus 5 kg. See `docs/DATA_MODEL.md`.

## 007 — UUIDs, timestamps and soft deletes on all user tables
Date: 2026-10-28
These fields prepare the database for future backups and friend features.

## 008 — Exercise library from free-exercise-db
Date: 2026-10-28
The dataset is public domain, includes images and stretches, and can ship inside the app.

## 009 — Notes instead of custom measurement fields
Date: 2026-10-28
Rare measurements (box jump height, band color, seat height) go in notes at exercise, workout,
workout exercise or set level. The schema gets no new column for a rare measurement.

## 010 — Charts use fixed fields only
Date: 2026-10-28
Charts use weight, reps, duration and distance. Note-only exercises get a plain set history instead.

## 011 — Supersets through groups, saved supersets through templates
Date: 2026-10-28
`workout_exercises.groupId` links exercises into a superset. Templates store saved supersets and routines.
Adding a template copies its rows, so template edits never change history.

## 012 — Units are a display setting
Date: 2026-10-28
Default is kg and metric distance. Users can choose lb and imperial distance as separate settings.
Storage stays in grams and meters, so changing units never changes data.

## 013 — Features can be turned off, with presets at first start
Date: 2026-10-28
Casual users should see a simple interface. Rest timers, supersets, templates and other extras are toggles.
First-time setup offers simple, standard and advanced presets, plus unit choice. Toggles hide interface only.

## 014 — Unit override per exercise
Date: 2026-10-28
Gyms mix equipment marked in kg and lb. A user can choose a unit for one exercise.
The override lives in `exercise_preferences` (renamed from `exercise_notes`) and only changes the display.

## 015 — SQLite plugin: @capacitor-community/sqlite
Date: 2026-10-28
The plugin is free and open source. The Capawesome plugin needs a paid license and a private registry.
Drizzle talks to the plugin through its `sqlite-proxy` driver and a small bridge in `src/db/driver.ts`.
The browser dev server uses the plugin's web version (`jeep-sqlite`, stored in IndexedDB).

## Open questions
- Pricing (draft): free app plus a cheap yearly plan, no monthly plan. Recommendation so far:
  about 4.99€ per year plus a lifetime option; logging, history and CSV export always free.
- Keep Next.js, or move to Vite + React?
- Excel library: SheetJS or ExcelJS?
