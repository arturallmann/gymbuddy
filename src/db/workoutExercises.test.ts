import { describe, expect, test } from 'vitest';
import { exercises, sets } from './schema';
import { makeSuperset } from './groups';
import { getLocalSettings } from './settings';
import {
  addWorkoutExercise,
  addWorkoutExerciseWithSet,
  changeWorkoutExercisePhase,
  getWorkoutExercise,
  deleteWorkoutExercise,
  listWorkoutExercises,
  moveWorkoutExercise,
  moveWorkoutExerciseTo,
} from './workoutExercises';
import { listSets } from './sets';
import { deleteWorkout, startWorkout } from './workouts';
import { createTestDatabase } from '@/testing/database';

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  return { db, userId };
}

describe('workout exercises', () => {
  async function withExercises(...names: string[]) {
    const { db, userId } = await setup();
    const workout = await startWorkout(db, userId);
    const ids: Record<string, string> = {};
    for (const name of names) {
      ids[name] = crypto.randomUUID();
      await db
        .insert(exercises)
        .values({ id: ids[name], source: 'custom', name, category: 'strength', loadType: 'external' });
    }
    const names_ = async () => (await listWorkoutExercises(db, workout.id)).map((item) => item.name);
    return { db, workout, ids, names: names_ };
  }

  test('add exercises at the end, in the order they were added', async () => {
    const { db, workout, ids, names } = await withExercises('Squat', 'Bench Press');
    await addWorkoutExercise(db, workout.id, ids['Squat']);
    await addWorkoutExercise(db, workout.id, ids['Bench Press']);

    expect(await names()).toEqual(['Squat', 'Bench Press']);
    expect((await listWorkoutExercises(db, workout.id)).map((item) => item.position)).toEqual([1, 2]);
  });

  test('allow the same exercise twice', async () => {
    const { db, workout, ids, names } = await withExercises('Squat');
    await addWorkoutExercise(db, workout.id, ids['Squat']);
    await addWorkoutExercise(db, workout.id, ids['Squat']);

    expect(await names()).toEqual(['Squat', 'Squat']);
  });

  test('give two adds at once different positions', async () => {
    const { db, workout, ids } = await withExercises('Squat', 'Bench Press');
    await Promise.all([
      addWorkoutExercise(db, workout.id, ids['Squat']),
      addWorkoutExercise(db, workout.id, ids['Bench Press']),
    ]);

    const positions = (await listWorkoutExercises(db, workout.id)).map((item) => item.position);
    expect(positions).toEqual([1, 2]);
  });

  test('move a workout exercise up and down', async () => {
    const { db, workout, ids, names } = await withExercises('Squat', 'Bench Press', 'Row');
    for (const name of ['Squat', 'Bench Press', 'Row']) await addWorkoutExercise(db, workout.id, ids[name]);
    const [squat, , row] = await listWorkoutExercises(db, workout.id);

    await moveWorkoutExercise(db, row.id, 'up');
    expect(await names()).toEqual(['Squat', 'Row', 'Bench Press']);

    await moveWorkoutExercise(db, squat.id, 'down');
    expect(await names()).toEqual(['Row', 'Squat', 'Bench Press']);
  });

  test('move a workout exercise to another place, such as after a drag', async () => {
    const { db, workout, ids, names } = await withExercises('Squat', 'Bench Press', 'Row', 'Curl');
    for (const name of ['Squat', 'Bench Press', 'Row', 'Curl']) await addWorkoutExercise(db, workout.id, ids[name]);
    const [squat, bench, , curl] = await listWorkoutExercises(db, workout.id);

    await moveWorkoutExerciseTo(db, curl.id, 0);
    expect(await names()).toEqual(['Curl', 'Squat', 'Bench Press', 'Row']);

    await makeSuperset(db, workout.id, [squat.id, bench.id]);
    await moveWorkoutExerciseTo(db, bench.id, 2);
    expect(await names()).toEqual(['Curl', 'Row', 'Squat', 'Bench Press']);
    expect((await listWorkoutExercises(db, workout.id)).map((item) => item.position)).toEqual([1, 2, 3, 4]);
  });

  test('move only inside the phase of the workout exercise', async () => {
    const { db, workout, ids, names } = await withExercises('Squat', 'Row', 'Stretch');
    for (const name of ['Squat', 'Row', 'Stretch']) await addWorkoutExercise(db, workout.id, ids[name]);
    const [, row, stretch] = await listWorkoutExercises(db, workout.id);
    await changeWorkoutExercisePhase(db, stretch.id, 'cooldown');

    await moveWorkoutExerciseTo(db, stretch.id, 0);
    await moveWorkoutExerciseTo(db, row.id, 0);

    expect(await names()).toEqual(['Row', 'Squat', 'Stretch']);
    await expect(moveWorkoutExerciseTo(db, 'unknown', 0)).rejects.toThrow('not found');
  });

  test('keep the order when the first moves up or the last moves down', async () => {
    const { db, workout, ids, names } = await withExercises('Squat', 'Row');
    await addWorkoutExercise(db, workout.id, ids['Squat']);
    await addWorkoutExercise(db, workout.id, ids['Row']);
    const [squat, row] = await listWorkoutExercises(db, workout.id);

    await moveWorkoutExercise(db, squat.id, 'up');
    await moveWorkoutExercise(db, row.id, 'down');

    expect(await names()).toEqual(['Squat', 'Row']);
  });

  test('delete a workout exercise with its sets, and skip it when moving', async () => {
    const { db, workout, ids, names } = await withExercises('Squat', 'Bench Press', 'Row');
    for (const name of ['Squat', 'Bench Press', 'Row']) await addWorkoutExercise(db, workout.id, ids[name]);
    const [, bench, row] = await listWorkoutExercises(db, workout.id);
    await db.insert(sets).values({ workoutExerciseId: bench.id, position: 1, reps: 5 });

    await deleteWorkoutExercise(db, bench.id);
    expect(await names()).toEqual(['Squat', 'Row']);
    const [set] = await db.select().from(sets);
    expect(set.deletedAt).not.toBeNull();

    await moveWorkoutExercise(db, row.id, 'up');
    expect(await names()).toEqual(['Row', 'Squat']);
    await expect(moveWorkoutExercise(db, bench.id, 'up')).rejects.toThrow('not found');
  });

  test('add after a deleted last exercise without a gap problem', async () => {
    const { db, workout, ids, names } = await withExercises('Squat', 'Row');
    const squatId = await addWorkoutExercise(db, workout.id, ids['Squat']);
    await deleteWorkoutExercise(db, squatId);
    await addWorkoutExercise(db, workout.id, ids['Row']);

    expect(await names()).toEqual(['Row']);
  });
});

describe('getWorkoutExercise', () => {
  test('return the workout exercise with its exercise and workout', async () => {
    const { db, userId } = await setup();
    const exerciseId = crypto.randomUUID();
    await db
      .insert(exercises)
      .values({ id: exerciseId, source: 'custom', name: 'Plank', category: 'strength', loadType: 'bodyweight', tracksDuration: true });
    const workout = await startWorkout(db, userId);
    const id = await addWorkoutExercise(db, workout.id, exerciseId);

    expect(await getWorkoutExercise(db, id)).toMatchObject({
      id,
      workoutId: workout.id,
      exerciseId,
      name: 'Plank',
      loadType: 'bodyweight',
      tracksDuration: true,
      tracksReps: false,
    });
  });

  test('return null for a deleted workout exercise, a discarded workout or an unknown id', async () => {
    const { db, userId } = await setup();
    const exerciseId = crypto.randomUUID();
    await db
      .insert(exercises)
      .values({ id: exerciseId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external' });
    const workout = await startWorkout(db, userId);
    const deleted = await addWorkoutExercise(db, workout.id, exerciseId);
    await deleteWorkoutExercise(db, deleted);
    const kept = await addWorkoutExercise(db, workout.id, exerciseId);

    expect(await getWorkoutExercise(db, deleted)).toBeNull();
    expect(await getWorkoutExercise(db, 'unknown')).toBeNull();
    await deleteWorkout(db, workout.id);
    expect(await getWorkoutExercise(db, kept)).toBeNull();
  });
});

describe('phases', () => {
  async function withWorkout() {
    const { db, userId } = await setup();
    const ids: Record<string, string> = {};
    for (const name of ['Jog', 'Squat', 'Row', 'Hamstring Stretch']) {
      ids[name] = crypto.randomUUID();
      await db.insert(exercises).values({
        id: ids[name],
        source: 'custom',
        name,
        category: name.includes('Stretch') ? 'stretch' : 'strength',
        loadType: 'none',
        defaultDurationSeconds: name.includes('Stretch') ? 30 : null,
      });
    }
    const workout = await startWorkout(db, userId);
    return { db, ids, workout };
  }

  test('add a workout exercise in a phase, and list its phase, category and default duration', async () => {
    const { db, ids, workout } = await withWorkout();
    await addWorkoutExercise(db, workout.id, ids['Squat']);
    await addWorkoutExercise(db, workout.id, ids['Hamstring Stretch'], 'cooldown');

    expect((await listWorkoutExercises(db, workout.id)).map((item) => [item.name, item.phase, item.category, item.defaultDurationSeconds])).toEqual([
      ['Squat', 'main', 'strength', null],
      ['Hamstring Stretch', 'cooldown', 'stretch', 30],
    ]);
  });

  test('move a workout exercise only among the exercises of its phase', async () => {
    const { db, ids, workout } = await withWorkout();
    const jog = await addWorkoutExercise(db, workout.id, ids['Jog'], 'warmup');
    await addWorkoutExercise(db, workout.id, ids['Squat']);
    await addWorkoutExercise(db, workout.id, ids['Hamstring Stretch'], 'cooldown');
    const row = await addWorkoutExercise(db, workout.id, ids['Row']);
    const names = async () => (await listWorkoutExercises(db, workout.id)).map((item) => item.name);

    await moveWorkoutExercise(db, row, 'up');
    expect(await names()).toEqual(['Jog', 'Row', 'Hamstring Stretch', 'Squat']);

    await moveWorkoutExercise(db, row, 'up');
    await moveWorkoutExercise(db, jog, 'down');
    expect(await names()).toEqual(['Jog', 'Row', 'Hamstring Stretch', 'Squat']);
  });

  test('change the phase of a workout exercise', async () => {
    const { db, ids, workout } = await withWorkout();
    const stretch = await addWorkoutExercise(db, workout.id, ids['Hamstring Stretch']);

    await changeWorkoutExercisePhase(db, stretch, 'cooldown');

    expect((await listWorkoutExercises(db, workout.id))[0].phase).toBe('cooldown');
  });
});

describe('addWorkoutExerciseWithSet', () => {
  const values = {
    setType: 'normal' as const,
    weightGrams: 60000,
    reps: 8,
    durationSeconds: null,
    distanceMeters: null,
    rpe: null,
    notes: null,
  };

  async function withTwoExercises() {
    const { db, userId } = await setup();
    const workout = await startWorkout(db, userId);
    const squat = crypto.randomUUID();
    const stretch = crypto.randomUUID();
    await db.insert(exercises).values([
      { id: squat, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external' },
      { id: stretch, source: 'custom', name: 'Hamstring Stretch', category: 'stretch', loadType: 'none' },
    ]);
    return { db, workout, squat, stretch };
  }

  test('add the exercise at the end with its first set', async () => {
    const { db, workout, squat, stretch } = await withTwoExercises();
    await addWorkoutExercise(db, workout.id, squat);

    const id = await addWorkoutExerciseWithSet(db, workout.id, stretch, 'cooldown', values);

    const items = await listWorkoutExercises(db, workout.id);
    expect(items.map((item) => [item.name, item.position, item.phase])).toEqual([
      ['Squat', 1, 'main'],
      ['Hamstring Stretch', 2, 'cooldown'],
    ]);
    expect(items[1].id).toBe(id);
    expect(await listSets(db, id)).toEqual([expect.objectContaining({ position: 1, weightGrams: 60000, reps: 8 })]);
  });

  test('count only workout exercises that are not deleted for the position', async () => {
    const { db, workout, squat, stretch } = await withTwoExercises();
    await deleteWorkoutExercise(db, await addWorkoutExercise(db, workout.id, squat));
    await addWorkoutExercise(db, workout.id, squat);

    const id = await addWorkoutExerciseWithSet(db, workout.id, stretch, 'main', values);

    expect((await getWorkoutExercise(db, id))?.position).toBe(2);
  });

  test('two adds at once get different positions', async () => {
    const { db, workout, squat, stretch } = await withTwoExercises();

    await Promise.all([
      addWorkoutExerciseWithSet(db, workout.id, squat, 'main', values),
      addWorkoutExerciseWithSet(db, workout.id, stretch, 'main', values),
    ]);

    expect((await listWorkoutExercises(db, workout.id)).map((item) => item.position).sort()).toEqual([1, 2]);
  });
});
