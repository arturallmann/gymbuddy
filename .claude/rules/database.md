---
paths:
  - "src/db/**/*.ts"
  - "drizzle/**"
---

# Database rules

- Change tables only in `src/db/schema.ts`. Then run `npm run db:generate`.
- Never edit generated files in `drizzle/` or `src/db/migrations.ts` by hand.
- Every new user table gets `id` (UUID), `createdAt`, `updatedAt` and `deletedAt` from the shared helpers.
- Every read filters `deletedAt IS NULL`.
- A unique index on a user table covers only rows that are not deleted: `uniqueIndex(...).on(...).where(notDeleted)`.
- Group several writes in one transaction. Each call to the SQLite plugin crosses into native code.
- Query functions return typed objects. They never return raw plugin rows.
- Never use `.returning()`. The plugin fakes RETURNING on Android and returns wrong rows. Write rows with an id from `crypto.randomUUID()`, then select them by id. See decision 016 in `docs/DECISIONS.md`.
- Name every computed column with `.as()`, such as `count(sets.id).as('setCount')`. In a join, an unnamed column is called `count("sets"."id")`, and the plugin on Android cannot read a column name with a dot. `src/db/driver.ts` rejects it. See decision 020.
- Each query file has tests that run against an in-memory SQLite database (`createTestDatabase()` in `src/testing/database.ts`). See `docs/TESTING.md`.
