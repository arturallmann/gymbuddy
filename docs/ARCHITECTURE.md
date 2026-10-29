# Architecture

## Goal

The app works fully without internet. Online features (backups, friends) come later and stay optional.

## Layers

```
Interface (Next.js pages + React components, static export)
        │  calls
Data layer (src/db/ — Drizzle queries, one file per area)
        │  calls
Capacitor SQLite plugin (native code)
        │
SQLite database file on the phone
```

Native features (file save, share menu, timers in the background) go through Capacitor plugins.
Wrap each plugin in a small module in `src/native/`, so the interface never calls plugins directly:
`files.ts` (Filesystem), `share.ts` (Share) and `alert.ts` (Haptics, plus a tone for the stretch timer).

## Folder layout (target)

```
src/
  app/            Next.js routes (pages only, no API routes)
  components/     React components
  db/
    schema.ts     Drizzle schema (single source of truth for tables)
    client.ts     Opens the database and runs migrations at app start
    driver.ts     Bridge between Drizzle (sqlite-proxy) and the SQLite plugin
    migrate.ts    Runs pending migrations from migrations.ts in one transaction
    migrations.ts Generated migrations as a module (do not edit by hand)
    DatabaseContext.ts  React context and useDatabase() for the open database
    seed.ts       Seeds the exercise library on first start
    settings.ts   Queries for the local user and settings
    appState.ts   Queries for app state, such as the library version
    workouts.ts   Queries for workouts, workout exercises and sets
    exercises.ts  Queries for exercises, muscle groups and images, and custom exercises
    preferences.ts  Queries for exercise preferences (notes and unit override)
    export.ts     Queries that build export rows
  hooks/          React hooks, such as useSettings(), useFeatures() and useActiveWorkout()
  lib/            Pure helpers (unit conversion, formatting, CSV building)
  testing/        Test helpers: test database, render with providers, fake plugin
  native/         Wrappers around Capacitor plugins
drizzle/          Generated migration files (do not edit by hand)
scripts/          Build helpers: bundling migrations, copying the SQLite WebAssembly file,
                  downloading a new version of the exercise library
data/             Seed data (exercise library from free-exercise-db)
docs/             Project documentation
```

## Data flow

1. The app starts and `src/db/client.ts` opens the database.
2. The client runs pending Drizzle migrations.
3. On first start, and when the library version changes, the client seeds the exercise library.
   On first start it also creates one local user.
4. Pages call functions in `src/db/`. These functions return typed objects.
5. The interface converts grams and seconds into display values.

## Exercise library updates

1. `scripts/update-exercise-library.mjs <commit>` downloads free-exercise-db into `data/free-exercise-db/`
   and writes the commit to `version.json`.
2. At start, `seedLibraryIfChanged()` in `src/db/seed.ts` compares the library version
   (commit plus `SEED_VERSION`) with `app_state.libraryVersion`. Only when they differ does it
   load `exercises.json` and seed, so a normal start reads one row.
3. `seedLibrary()` inserts new library exercises and updates changed ones. It never changes rows with
   `source = 'custom'` or any `exercise_preferences`. Then the client writes the new library version.

## Export

1. `src/db/export.ts` returns one row per set, in workout and position order.
2. `src/lib/exportTable.ts` turns the rows into a table in display units (decision 022).
3. `src/lib/csv.ts` builds CSV text; `src/lib/excel.ts` builds `.xlsx` files with ExcelJS, loaded only on export.
4. `src/native/files.ts` saves the file to the cache folder with the Filesystem plugin (in the browser it downloads).
5. `src/native/share.ts` opens the phone's share menu.
The Export section on the settings page (`src/components/ExportData.tsx`) runs these steps.

## Import

1. The user picks a `.csv` or `.xlsx` file (a plain file input; Capacitor's web view opens the phone's file picker).
2. `src/lib/importFile.ts` reads it into a table: `parseCsv()` or `fromXlsx()`.
3. `src/lib/importTable.ts` checks every row and turns the table into workouts in storage units,
   or returns the problems with row numbers (decision 024).
4. `src/db/import.ts` adds the workouts in one transaction, skips those that already exist and
   creates custom exercises for unknown names.

## Future sync (not built yet)

Every user table has `id` (UUID), `createdAt`, `updatedAt` and `deletedAt`.
A later sync process sends rows changed since the last sync to a server.
Do not build sync until `docs/ROADMAP.md` lists it as the current phase.
