import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import {
  DEFAULT_REST_SECONDS,
  changeGroupRest,
  getWorkoutGroup,
  listGroupRests,
  makeSuperset,
  ungroupWorkoutExercises,
} from './groups';
import { exercises, workoutGroups } from './schema';
import { getLocalSettings } from './settings';
import {
  addSet,
  addWorkoutExercise,
  changeWorkoutExercisePhase,
  deleteWorkoutExercise,
  listSets,
  listWorkoutExercises,
  moveWorkoutExercise,
  startWorkout,
} from './workouts';
import { createTestDatabase } from '@/testing/database';

async function setup(names = ['Squat', 'Curl', 'Press', 'Row', 'Stretch']) {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const workout = await startWorkout(db, userId);
  const ids: Record<string, string> = {};
  for (const name of names) {
    const exerciseId = crypto.randomUUID();
    await db.insert(exercises).values({ id: exerciseId, source: 'custom', name, category: 'strength', loadType: 'external', tracksReps: true });
    ids[name] = await addWorkoutExercise(db, workout.id, exerciseId, name === 'Stretch' ? 'cooldown' : 'main');
  }
  const order = async () => (await listWorkoutExercises(db, workout.id)).map((item) => [item.name, item.groupId !== null]);
  return { db, workout, ids, order };
}

describe('makeSuperset', () => {
  test('group workout exercises, move them next to the first one, and keep the rest in order', async () => {
    const { db, workout, ids, order } = await setup();

    const groupId = await makeSuperset(db, workout.id, [ids['Row'], ids['Curl']]);

    expect(await order()).toEqual([
      ['Squat', false],
      ['Curl', true],
      ['Row', true],
      ['Press', false],
      ['Stretch', false],
    ]);
    expect(await getWorkoutGroup(db, groupId)).toMatchObject({
      group: { groupType: 'superset', restSeconds: DEFAULT_REST_SECONDS, workoutId: workout.id },
      members: [{ name: 'Curl' }, { name: 'Row' }],
    });
  });

  test('allow three or more workout exercises', async () => {
    const { db, workout, ids } = await setup();
    const groupId = await makeSuperset(db, workout.id, [ids['Squat'], ids['Curl'], ids['Press']], 60);

    expect((await getWorkoutGroup(db, groupId))?.members.map((member) => member.name)).toEqual(['Squat', 'Curl', 'Press']);
  });

  test('refuse one workout exercise, a grouped one, or workout exercises of two phases, and change nothing', async () => {
    const { db, workout, ids, order } = await setup();
    await makeSuperset(db, workout.id, [ids['Squat'], ids['Curl']]);
    const before = await order();

    await expect(makeSuperset(db, workout.id, [ids['Press']])).rejects.toThrow('two or more');
    await expect(makeSuperset(db, workout.id, [ids['Curl'], ids['Press']])).rejects.toThrow('in a group already');
    await expect(makeSuperset(db, workout.id, [ids['Press'], ids['Stretch']])).rejects.toThrow('one phase');
    await expect(makeSuperset(db, workout.id, [ids['Press'], 'unknown'])).rejects.toThrow('two or more');

    expect(await order()).toEqual(before);
    expect(await db.select().from(workoutGroups)).toHaveLength(1);
  });
});

describe('groups in a workout', () => {
  test('move a group as one block, from any member, and move single exercises past it', async () => {
    const { db, workout, ids } = await setup();
    await makeSuperset(db, workout.id, [ids['Curl'], ids['Press']]);
    const names = async () => (await listWorkoutExercises(db, workout.id)).map((item) => item.name);

    await moveWorkoutExercise(db, ids['Press'], 'up');
    expect(await names()).toEqual(['Curl', 'Press', 'Squat', 'Row', 'Stretch']);

    await moveWorkoutExercise(db, ids['Row'], 'up');
    expect(await names()).toEqual(['Curl', 'Press', 'Row', 'Squat', 'Stretch']);
    await moveWorkoutExercise(db, ids['Row'], 'up');
    expect(await names()).toEqual(['Row', 'Curl', 'Press', 'Squat', 'Stretch']);
  });

  test('change the phase of the whole group from one member', async () => {
    const { db, workout, ids } = await setup();
    await makeSuperset(db, workout.id, [ids['Curl'], ids['Press']]);

    await changeWorkoutExercisePhase(db, ids['Curl'], 'warmup');

    const phases = (await listWorkoutExercises(db, workout.id)).map((item) => [item.name, item.phase]);
    expect(phases).toContainEqual(['Curl', 'warmup']);
    expect(phases).toContainEqual(['Press', 'warmup']);
    expect(phases).toContainEqual(['Squat', 'main']);
  });

  test('ungroup and keep the sets and the order', async () => {
    const { db, workout, ids, order } = await setup();
    const groupId = await makeSuperset(db, workout.id, [ids['Curl'], ids['Press']]);
    await addSet(db, ids['Curl'], { setType: 'normal', weightGrams: 20000, reps: 10, durationSeconds: null, distanceMeters: null, rpe: null, notes: null });

    await ungroupWorkoutExercises(db, groupId);

    expect(await order()).toEqual([
      ['Squat', false],
      ['Curl', false],
      ['Press', false],
      ['Row', false],
      ['Stretch', false],
    ]);
    expect(await listSets(db, ids['Curl'])).toHaveLength(1);
    expect(await getWorkoutGroup(db, groupId)).toBeNull();
  });

  test('end the group when deleting leaves one member, but not while two are left', async () => {
    const { db, workout, ids } = await setup();
    const groupId = await makeSuperset(db, workout.id, [ids['Squat'], ids['Curl'], ids['Press']]);

    await deleteWorkoutExercise(db, ids['Press']);
    expect((await getWorkoutGroup(db, groupId))?.members.map((member) => member.name)).toEqual(['Squat', 'Curl']);

    await deleteWorkoutExercise(db, ids['Curl']);
    expect(await getWorkoutGroup(db, groupId)).toBeNull();
    const squat = (await listWorkoutExercises(db, workout.id)).find((item) => item.name === 'Squat');
    expect(squat?.groupId).toBeNull();
  });

  test('change the rest of a group and list the rests', async () => {
    const { db, workout, ids } = await setup();
    const groupId = await makeSuperset(db, workout.id, [ids['Curl'], ids['Press']]);

    await changeGroupRest(db, groupId, 120);

    expect(await listGroupRests(db, [groupId, 'unknown'])).toEqual(new Map([[groupId, 120]]));
    const [row] = await db.select().from(workoutGroups).where(eq(workoutGroups.id, groupId));
    expect(row.restSeconds).toBe(120);
  });
});
