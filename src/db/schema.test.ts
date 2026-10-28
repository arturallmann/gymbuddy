import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { buildMigrationsModule } from '../../scripts/bundle-migrations.mjs';
import { migrations } from './migrations';
import * as schema from './schema';

describe('migrations', () => {
  test('src/db/migrations.ts matches drizzle/', () => {
    // Fails when someone ran drizzle-kit generate without npm run db:generate.
    expect(readFileSync('src/db/migrations.ts', 'utf8')).toBe(buildMigrationsModule());
  });

  test('create every table in the schema', () => {
    const sqlite = new Database(':memory:');
    for (const statement of migrations.flatMap((migration) => migration.statements)) {
      sqlite.exec(statement);
    }
    const db = drizzle(sqlite, { schema });

    const user = db.insert(schema.users).values({}).returning().get();
    db.insert(schema.userSettings).values({ userId: user.id }).run();
    const settings = db.select().from(schema.userSettings).get();

    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(settings).toMatchObject({
      userId: user.id,
      weightUnit: 'kg',
      distanceUnit: 'metric',
      preset: 'standard',
      features: {},
      setupCompletedAt: null,
      deletedAt: null,
    });
    expect(settings?.createdAt).toBeInstanceOf(Date);
  });

  test('allow a new exercise preferences row after the old one is deleted', () => {
    const sqlite = new Database(':memory:');
    for (const statement of migrations.flatMap((migration) => migration.statements)) {
      sqlite.exec(statement);
    }
    const db = drizzle(sqlite, { schema });
    const userId = crypto.randomUUID();
    const exerciseId = crypto.randomUUID();
    db.insert(schema.users).values({ id: userId }).run();
    db.insert(schema.exercises)
      .values({ id: exerciseId, source: 'custom', name: 'Curl', category: 'strength', loadType: 'external' })
      .run();
    const preferences = { userId, exerciseId, notes: 'Seat at 4' };

    db.insert(schema.exercisePreferences).values({ ...preferences, deletedAt: new Date() }).run();
    db.insert(schema.exercisePreferences).values(preferences).run();

    expect(() => db.insert(schema.exercisePreferences).values(preferences).run()).toThrow('UNIQUE');
  });
});
