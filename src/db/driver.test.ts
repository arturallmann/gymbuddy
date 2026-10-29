import { count, desc, eq, max, sql } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { runMigrations } from './migrate';
import { migrations } from './migrations';
import { exercises, sets, users, workoutExercises, workouts } from './schema';
import { createTestDatabase } from '@/testing/database';

async function seedWorkout() {
  const { conn, db } = await createTestDatabase();
  const user = { id: crypto.randomUUID() };
  const exercise = { id: crypto.randomUUID() };
  const workout = { id: crypto.randomUUID() };
  const workoutExercise = { id: crypto.randomUUID() };
  await db.insert(users).values(user);
  await db
    .insert(exercises)
    .values({ ...exercise, source: 'custom', name: 'Bench Press', category: 'strength', loadType: 'external' });
  await db.insert(workouts).values({ ...workout, userId: user.id, startedAt: new Date(1_000) });
  await db
    .insert(workoutExercises)
    .values({ ...workoutExercise, workoutId: workout.id, exerciseId: exercise.id, position: 1 });
  return { conn, db, user, exercise, workout, workoutExercise };
}

describe('driver', () => {
  test('keep columns with the same name apart in joins', async () => {
    const { db, workout, workoutExercise } = await seedWorkout();
    const rows = await db
      .select()
      .from(workouts)
      .innerJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id));

    expect(rows).toHaveLength(1);
    expect(rows[0].workouts.id).toBe(workout.id);
    expect(rows[0].workout_exercises.id).toBe(workoutExercise.id);
    expect(rows[0].workouts.startedAt).toEqual(new Date(1_000));
  });

  test('keep the order of ORDER BY', async () => {
    const { db, workoutExercise } = await seedWorkout();
    await db.insert(sets).values([
      { workoutExerciseId: workoutExercise.id, position: 1, reps: 10 },
      { workoutExerciseId: workoutExercise.id, position: 2, reps: 8 },
      { workoutExerciseId: workoutExercise.id, position: 3, reps: 6 },
    ]);
    const rows = await db.select().from(sets).orderBy(desc(sets.position));

    expect(rows.map((row) => row.reps)).toEqual([6, 8, 10]);
  });

  test('return one row or undefined from get', async () => {
    const { db, user } = await seedWorkout();

    expect((await db.select().from(users).get())?.id).toBe(user.id);
    expect(await db.select().from(users).where(eq(users.id, 'missing')).get()).toBeUndefined();
  });

  test('reject RETURNING, which the plugin does not support on Android', async () => {
    const { db, workout } = await seedWorkout();

    // Drizzle wraps the error as "Failed query: …" with the original as `cause`.
    const notSupported = { cause: expect.objectContaining({ message: expect.stringContaining('RETURNING') }) };
    await expect(db.insert(users).values({}).returning()).rejects.toMatchObject(notSupported);
    await expect(
      db.update(workouts).set({ notes: 'Felt strong' }).where(eq(workouts.id, workout.id)).returning(),
    ).rejects.toMatchObject(notSupported);
  });

  test('reject a computed column with a dot and without a name, which the plugin cannot read on Android', async () => {
    const { db } = await seedWorkout();

    const unnamed = { cause: expect.objectContaining({ message: expect.stringContaining(".as('name')") }) };
    // Drizzle adds the table name, and so the dot, only when the query joins tables.
    await expect(
      db.select({ n: count(sets.id) }).from(sets).innerJoin(workoutExercises, sql`1`),
    ).rejects.toMatchObject(unnamed);
    await expect(db.select({ id: workouts.id, last: max(sets.position) }).from(sets).innerJoin(workouts, sql`1`)).rejects.toMatchObject(unnamed);
    expect(await db.select({ n: count() }).from(users)).toEqual([{ n: 1 }]);
  });

  test('read named computed columns and plain columns of joined tables', async () => {
    const { db, workout } = await seedWorkout();

    const [row] = await db
      .select({ id: workouts.id, n: count(sets.id).as('setCount'), last: max(sets.position).as('last') })
      .from(workouts)
      .leftJoin(sets, sql`1 = 0`)
      .groupBy(workouts.id);
    expect(row).toEqual({ id: workout.id, n: 0, last: null });
  });

  test('allow functions inside WHERE and subqueries in WHERE', async () => {
    const { db, workout } = await seedWorkout();

    const rows = await db
      .select({ id: workouts.id })
      .from(workouts)
      .where(sql`lower(${workouts.id}) = lower(${workout.id}) and ${workouts.id} in (select "id" from "workouts")`);
    expect(rows).toEqual([{ id: workout.id }]);
  });

  test('run PRAGMA statements', async () => {
    const { db } = await seedWorkout();
    const rows = await db.all<{ foreign_keys: number }>(sql`PRAGMA foreign_keys`);

    expect(rows).toEqual([[1]]);
  });

  test('roll back a failed transaction', async () => {
    const { db } = await seedWorkout();
    await expect(
      db.transaction(async (tx) => {
        await tx.insert(users).values({});
        throw new Error('stop');
      }),
    ).rejects.toThrow('stop');

    expect(await db.select().from(users)).toHaveLength(1);
  });

  test('run transactions that start at the same time one after the other', async () => {
    const { db } = await seedWorkout();
    await Promise.all(
      [1, 2, 3].map(() =>
        db.transaction(async (tx) => {
          await tx.insert(users).values({});
          await tx.insert(users).values({});
        }),
      ),
    );

    expect(await db.select().from(users)).toHaveLength(7);
  });

  test('run a batch in one transaction', async () => {
    const { db } = await seedWorkout();
    const [, all] = await db.batch([db.insert(users).values({}), db.select().from(users)]);

    expect(all).toHaveLength(2);
  });
});

describe('runMigrations', () => {
  test('apply each migration once', async () => {
    const { conn } = await createTestDatabase();
    await runMigrations(conn, migrations);
    const recorded = await conn.query('SELECT hash FROM "__drizzle_migrations"');

    expect(recorded.values).toHaveLength(migrations.length);
  });

  test('roll back a failed migration', async () => {
    const { conn } = await createTestDatabase();
    const broken = {
      tag: '9999_broken',
      when: Number.MAX_SAFE_INTEGER,
      hash: 'broken',
      statements: ['CREATE TABLE "partial" (id TEXT)', 'NOT SQL'],
    };

    await expect(runMigrations(conn, [...migrations, broken])).rejects.toThrow();
    const tables = await conn.query(`SELECT name FROM sqlite_master WHERE name = 'partial'`);
    expect(tables.values).toHaveLength(0);
  });
});
