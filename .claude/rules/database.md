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
- Group several writes in one transaction. Each call to the SQLite plugin crosses into native code.
- Query functions return typed objects. They never return raw plugin rows.
- Each query file has tests that run against an in-memory SQLite database.
