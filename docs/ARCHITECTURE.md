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
Wrap each plugin in a small module in `src/native/`, so the interface never calls plugins directly.

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
    workouts.ts   Queries for workouts, workout exercises and sets
    exercises.ts  Queries for exercises, muscle groups and images
    export.ts     Queries that build export rows
  hooks/          React hooks, such as useSettings() and useFeatures()
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
3. On first start, the client seeds the exercise library and creates one local user.
4. Pages call functions in `src/db/`. These functions return typed objects.
5. The interface converts grams and seconds into display values.

## Exercise library updates

1. `scripts/update-exercise-library.mjs <commit>` downloads free-exercise-db into `data/free-exercise-db/`.
2. The app bundles that file. At start, `seedLibraryIfEmpty()` in `src/db/seed.ts` seeds the library
   only when no library exercise exists yet.
3. `seedLibrary()` inserts new library exercises and updates changed ones. It never changes rows with
   `source = 'custom'` or any `exercise_preferences`.

Not built yet: a phone that already has the library does not get a newer version after an app update.

## Export

1. `src/db/export.ts` returns one row per set, in workout and position order.
2. `src/lib/csv.ts` builds CSV text. An Excel library builds `.xlsx` files.
3. `src/native/files.ts` saves the file with the Filesystem plugin.
4. `src/native/share.ts` opens the phone's share menu.

## Future sync (not built yet)

Every user table has `id` (UUID), `createdAt`, `updatedAt` and `deletedAt`.
A later sync process sends rows changed since the last sync to a server.
Do not build sync until `docs/ROADMAP.md` lists it as the current phase.
