import { desc, eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { runMigrations } from './migrate';
import { migrations } from './migrations';
import { exercises, sets, users, workoutExercises, workouts } from './schema';
import { createTestDatabase } from './testing';

async function seedWorkout() {
  const { conn, db } = await createTestDatabase();
  const [user] = await db.insert(users).values({}).returning();
  const [exercise] = await db
    .insert(exercises)
    .values({ source: 'custom', name: 'Bench Press', category: 'strength', loadType: 'external' })
    .returning();
  const [workout] = await db
    .insert(workouts)
    .values({ userId: user.id, startedAt: new Date(1_000) })
    .returning();
  const [workoutExercise] = await db
    .insert(workoutExercises)
    .values({ workoutId: workout.id, exerciseId: exercise.id, position: 1 })
    .returning();
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

  test('return rows from UPDATE with RETURNING', async () => {
    const { db, workout } = await seedWorkout();
    const [updated] = await db
      .update(workouts)
      .set({ notes: 'Felt strong' })
      .where(eq(workouts.id, workout.id))
      .returning();

    expect(updated.notes).toBe('Felt strong');
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
    const [inserted, all] = await db.batch([
      db.insert(users).values({}).returning(),
      db.select().from(users),
    ]);

    expect(inserted).toHaveLength(1);
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
