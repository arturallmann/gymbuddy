import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { exercises, workoutExercises } from '@/db/schema';
import { getLocalSettings, updateSettings } from '@/db/settings';
import { makeSuperset } from '@/db/groups';
import { saveGroupAsTemplate } from '@/db/templates';
import { addWorkoutExercise, changeWorkoutExercisePhase, endWorkout, listWorkoutExercises, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import WorkoutExercises from './WorkoutExercises';

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  for (const name of ['Squat', 'Row']) {
    await db.insert(exercises).values({ name, userId, source: 'custom', category: 'strength', loadType: 'external' });
  }
  const workout = await startWorkout(db, userId);
  const rendered = await renderWithDatabase(<WorkoutExercises workoutId={workout.id} />, { db });
  const names = async () => (await listWorkoutExercises(db, workout.id)).map((item) => item.name);
  return { ...rendered, workout, names };
}

async function addExercise(user: Awaited<ReturnType<typeof setup>>['user'], name: string) {
  await user.click(await screen.findByRole('button', { name: 'Add exercise' }));
  const picker = screen.getByRole('region', { name: 'Add exercise' });
  await user.click(await within(picker).findByRole('button', { name }));
  await screen.findByRole('button', { name: `Remove ${name}` });
}

describe('WorkoutExercises', () => {
  test('add exercises to the workout', async () => {
    const { user, names } = await setup();
    expect(await screen.findByText('No exercises yet.')).toBeInTheDocument();

    await addExercise(user, 'Squat');
    await addExercise(user, 'Row');

    expect(await names()).toEqual(['Squat', 'Row']);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Squat'),
      expect.stringContaining('Row'),
    ]);
  });

  test('reorder the workout exercises', async () => {
    const { user, names } = await setup();
    await addExercise(user, 'Squat');
    await addExercise(user, 'Row');

    await user.click(screen.getByRole('button', { name: 'Move Row up' }));

    await waitFor(async () => expect(await names()).toEqual(['Row', 'Squat']));
    expect(screen.getByRole('button', { name: 'Move Row up' })).toBeDisabled();
  });

  test('show a summary of the sets on the workout page, and log sets on the exercise page', async () => {
    const { user } = await setup();
    await addExercise(user, 'Squat');

    expect(await screen.findByRole('link', { name: /Squat\s*No sets yet/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/workout\/exercise\?id=/),
    );
    expect(screen.queryByRole('button', { name: 'Log set' })).not.toBeInTheDocument();
  });

  test('remove a workout exercise', async () => {
    const { db, user, names } = await setup();
    await addExercise(user, 'Squat');

    await user.click(screen.getByRole('button', { name: 'Remove Squat' }));

    expect(await screen.findByText('No exercises yet.')).toBeInTheDocument();
    expect(await names()).toEqual([]);
    const [row] = await db.select().from(workoutExercises);
    expect(row.deletedAt).not.toBeNull();
  });
});

describe('phases', () => {
  async function withStretch(phases: boolean, storedCooldown = false) {
    const { db } = await createTestDatabase();
    const local = await getLocalSettings(db);
    await updateSettings(db, local.id, { features: { phases } });
    const ids: string[] = [];
    for (const [name, category] of [['Squat', 'strength'], ['Hamstring Stretch', 'stretch']] as const) {
      const id = crypto.randomUUID();
      await db.insert(exercises).values({ id, name, userId: local.userId, source: 'custom', category, loadType: 'none', tracksDuration: true });
      ids.push(id);
    }
    const workout = await startWorkout(db, local.userId);
    if (storedCooldown) {
      await addWorkoutExercise(db, workout.id, ids[1], 'cooldown');
    }
    const rendered = await renderWithDatabase(<WorkoutExercises workoutId={workout.id} />, { db });
    return { ...rendered, workout };
  }

  test('add stretches to the cool-down phase and show one section per phase', async () => {
    const { db, user, workout } = await withStretch(true);
    await addExercise(user, 'Squat');
    await addExercise(user, 'Hamstring Stretch');

    expect(screen.getByRole('region', { name: 'Main phase' })).toHaveTextContent('Squat');
    expect(screen.getByRole('region', { name: 'Cool-down phase' })).toHaveTextContent('Hamstring Stretch');
    expect((await listWorkoutExercises(db, workout.id)).map((item) => item.phase)).toEqual(['main', 'cooldown']);
  });

  test('add everything to the main phase when phases are off, without phase sections', async () => {
    const { db, user, workout } = await withStretch(false);
    await addExercise(user, 'Hamstring Stretch');

    expect((await listWorkoutExercises(db, workout.id))[0].phase).toBe('main');
    expect(screen.queryByRole('region', { name: 'Main phase' })).not.toBeInTheDocument();
  });

  test('still show a stored phase when phases are off', async () => {
    await withStretch(false, true);

    expect(await screen.findByRole('link', { name: /Hamstring Stretch/ })).toHaveTextContent('Cool-down phase');
  });
});

describe('supersets', () => {
  async function withThree(features: { supersets?: boolean; phases?: boolean } = {}) {
    const { db } = await createTestDatabase();
    const local = await getLocalSettings(db);
    await updateSettings(db, local.id, { features: { supersets: true, phases: false, ...features } });
    const workout = await startWorkout(db, local.userId);
    const ids: string[] = [];
    for (const name of ['Squat', 'Curl', 'Press']) {
      const id = crypto.randomUUID();
      await db.insert(exercises).values({ id, name, userId: local.userId, source: 'custom', category: 'strength', loadType: 'external', tracksReps: true });
      ids.push(await addWorkoutExercise(db, workout.id, id));
    }
    return { db, workout, ids };
  }

  test('make a superset of chosen workout exercises', async () => {
    const { db, workout } = await withThree();
    const { user } = await renderWithDatabase(<WorkoutExercises workoutId={workout.id} />, { db });

    await user.click(await screen.findByRole('button', { name: 'Make superset' }));
    expect(screen.getByRole('button', { name: 'Make superset (0)' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Press' }));
    await user.click(screen.getByRole('checkbox', { name: 'Curl' }));
    await user.click(screen.getByRole('button', { name: 'Make superset (2)' }));

    const card = await screen.findByRole('listitem', { name: 'Superset: Curl + Press' });
    expect(card).toHaveTextContent('Superset · Rest 1:30');
    const items = await listWorkoutExercises(db, workout.id);
    expect(items.map((item) => [item.name, item.groupId !== null])).toEqual([
      ['Squat', false],
      ['Curl', true],
      ['Press', true],
    ]);
  });

  test('ungroup a superset', async () => {
    const { db, workout, ids } = await withThree();
    await makeSuperset(db, workout.id, [ids[1], ids[2]]);
    const { user } = await renderWithDatabase(<WorkoutExercises workoutId={workout.id} />, { db });

    await user.click(await screen.findByRole('button', { name: 'Ungroup' }));

    expect(await screen.findByRole('link', { name: /^Curl/ })).toBeInTheDocument();
    expect((await listWorkoutExercises(db, workout.id)).every((item) => item.groupId === null)).toBe(true);
  });

  test('hide Make superset and Ungroup when supersets are off, and still show a stored superset', async () => {
    const { db, workout, ids } = await withThree({ supersets: false });
    await makeSuperset(db, workout.id, [ids[1], ids[2]]);
    await renderWithDatabase(<WorkoutExercises workoutId={workout.id} />, { db });

    expect(await screen.findByRole('listitem', { name: 'Superset: Curl + Press' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make superset' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ungroup' })).not.toBeInTheDocument();
  });

  test('let the user choose only workout exercises of one phase', async () => {
    const { db, workout, ids } = await withThree({ phases: true });
    await changeWorkoutExercisePhase(db, ids[2], 'cooldown');
    const { user } = await renderWithDatabase(<WorkoutExercises workoutId={workout.id} />, { db });

    await user.click(await screen.findByRole('button', { name: 'Make superset' }));
    await user.click(screen.getByRole('checkbox', { name: 'Squat' }));

    expect(screen.getByRole('checkbox', { name: 'Curl' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Press' })).toBeDisabled();
  });
});

describe('saved supersets', () => {
  async function withSavedSuperset(templatesOn: boolean) {
    const { db } = await createTestDatabase();
    const local = await getLocalSettings(db);
    await updateSettings(db, local.id, { features: { supersets: true, templates: templatesOn, phases: false } });
    const first = await startWorkout(db, local.userId);
    const ids: string[] = [];
    for (const name of ['Curl', 'Press']) {
      const id = crypto.randomUUID();
      await db.insert(exercises).values({ id, name, userId: local.userId, source: 'custom', category: 'strength', loadType: 'external', tracksReps: true });
      ids.push(await addWorkoutExercise(db, first.id, id));
    }
    await saveGroupAsTemplate(db, local.userId, await makeSuperset(db, first.id, ids, 60), 'Arms');
    await endWorkout(db, first.id);
    const workout = await startWorkout(db, local.userId);
    const rendered = await renderWithDatabase(<WorkoutExercises workoutId={workout.id} />, { db });
    return { ...rendered, workout };
  }

  test('add a saved superset to the workout in one tap', async () => {
    const { db, user, workout } = await withSavedSuperset(true);

    await user.click(await screen.findByRole('button', { name: 'Add saved superset' }));
    await user.click(await screen.findByRole('button', { name: /Arms/ }));

    expect(await screen.findByRole('listitem', { name: 'Superset: Curl + Press' })).toHaveTextContent('Rest 1:00');
    expect((await listWorkoutExercises(db, workout.id)).map((item) => item.name)).toEqual(['Curl', 'Press']);
  });

  test('hide Add saved superset when templates are off', async () => {
    await withSavedSuperset(false);

    expect(await screen.findByRole('button', { name: 'Add exercise' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add saved superset' })).not.toBeInTheDocument();
  });
});
