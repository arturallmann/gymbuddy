import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getWorkoutGroup, makeSuperset } from '@/db/groups';
import { saveExercisePreferences } from '@/db/preferences';
import { exercises } from '@/db/schema';
import { getLocalSettings, updateSettings } from '@/db/settings';
import { addTemplateToWorkout, listTemplates, saveGroupAsTemplate } from '@/db/templates';
import { addSet, addWorkoutExercise, deleteWorkout, listSets, listWorkoutExercises, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import GroupView from './GroupView';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push }),
}));
vi.mock('@/native/alert', () => ({ signalTimerDone: vi.fn().mockResolvedValue(undefined) }));

beforeEach(() => {
  navigation.params = new URLSearchParams();
  navigation.push.mockReset();
});

const values = { setType: 'normal' as const, weightGrams: 20000, reps: 10, durationSeconds: null, distanceMeters: null, rpe: null, notes: null };

async function setup(features: { restTimer?: boolean; supersets?: boolean; templates?: boolean } = {}) {
  const { db } = await createTestDatabase();
  const local = await getLocalSettings(db);
  await updateSettings(db, local.id, { features: { restTimer: true, supersets: true, templates: true, ...features } });
  const workout = await startWorkout(db, local.userId);
  const ids: string[] = [];
  const exerciseIds: string[] = [];
  for (const name of ['Curl', 'Press']) {
    const id = crypto.randomUUID();
    await db.insert(exercises).values({ id, name, userId: local.userId, source: 'custom', category: 'strength', loadType: 'external', tracksReps: true });
    exerciseIds.push(id);
    ids.push(await addWorkoutExercise(db, workout.id, id));
  }
  const groupId = await makeSuperset(db, workout.id, ids, 60);
  return { db, userId: local.userId, ids, exerciseIds, groupId };
}

async function open(db: Awaited<ReturnType<typeof setup>>['db'], groupId: string) {
  navigation.params = new URLSearchParams({ id: groupId });
  return renderWithDatabase(<GroupView />, { db });
}

async function logNext(user: Awaited<ReturnType<typeof open>>['user'], weight: string, reps: string) {
  const form = await screen.findByRole('region', { name: 'Next set' });
  const weightInput = within(form).getByRole('textbox', { name: 'Weight (kg)' });
  await user.clear(weightInput);
  await user.type(weightInput, weight);
  const repsInput = within(form).getByRole('textbox', { name: 'Reps' });
  await user.clear(repsInput);
  await user.type(repsInput, reps);
  await user.click(within(form).getByRole('button', { name: 'Log set' }));
}

describe('GroupView', () => {
  test('guide through a round, show it as one row, then rest before the next round', async () => {
    const { db, ids, groupId } = await setup();
    const { user } = await open(db, groupId);

    expect(await screen.findByRole('heading', { name: 'Round 1 · Curl' })).toBeInTheDocument();
    await logNext(user, '20', '10');
    expect(await screen.findByRole('heading', { name: 'Round 1 · Press' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Rest timer' })).not.toBeInTheDocument();
    await logNext(user, '60', '8');

    expect(await screen.findByRole('region', { name: 'Rest timer' })).toHaveTextContent('1:00');
    expect(screen.getByRole('heading', { name: 'Round 2 · Curl' })).toBeInTheDocument();
    const rows = within(screen.getByRole('table', { name: 'Rounds' })).getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['1', '20 kg × 10', '60 kg × 8']);
    expect((await listSets(db, ids[0])).map((set) => set.position)).toEqual([1]);

    await user.click(screen.getByRole('button', { name: 'Skip rest' }));
    expect(screen.queryByRole('region', { name: 'Rest timer' })).not.toBeInTheDocument();
  });

  test('start no rest timer when the restTimer toggle is off, and hide the rest length', async () => {
    const { db, ids, groupId } = await setup({ restTimer: false });
    await addSet(db, ids[0], values);
    const { user } = await open(db, groupId);

    await logNext(user, '60', '8');

    expect(await screen.findByRole('heading', { name: 'Round 2 · Curl' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Rest timer' })).not.toBeInTheDocument();
    expect(screen.queryByText('Rest after each round')).not.toBeInTheDocument();
  });

  test('log a chosen exercise out of turn by tapping its empty cell', async () => {
    const { db, ids, groupId } = await setup();
    await addSet(db, ids[0], values);
    await addSet(db, ids[0], values);
    await addSet(db, ids[1], values);
    const { user } = await open(db, groupId);

    expect(await screen.findByRole('heading', { name: 'Round 2 · Press' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Log round 2, Press' }));
    expect(screen.getByRole('heading', { name: 'Round 2 · Press' })).toBeInTheDocument();
  });

  test('edit a set from the rounds table', async () => {
    const { db, ids, groupId } = await setup();
    await addSet(db, ids[0], values);
    const { user } = await open(db, groupId);

    await user.click(await screen.findByRole('button', { name: 'Edit round 1, Curl' }));
    const form = screen.getByRole('region', { name: 'Edit set' });
    const reps = within(form).getByRole('textbox', { name: 'Reps' });
    await user.clear(reps);
    await user.type(reps, '12');
    await user.click(within(form).getByRole('button', { name: 'Save set' }));

    expect(await screen.findByRole('region', { name: 'Next set' })).toBeInTheDocument();
    expect((await listSets(db, ids[0]))[0].reps).toBe(12);
  });

  test('use each exercise’s unit override', async () => {
    const { db, userId, exerciseIds, groupId } = await setup();
    await saveExercisePreferences(db, userId, exerciseIds[1], { weightUnit: 'lb' });
    const { user } = await open(db, groupId);
    await logNext(user, '20', '10');

    const form = await screen.findByRole('region', { name: 'Next set' });
    expect(within(form).getByRole('textbox', { name: 'Weight (lb)' })).toBeInTheDocument();
  });

  test('change the rest length in 15 second steps', async () => {
    const { db, groupId } = await setup();
    const { user } = await open(db, groupId);

    await user.click(await screen.findByRole('button', { name: 'More rest' }));

    expect(await screen.findByText('1:15')).toBeInTheDocument();
    expect((await getWorkoutGroup(db, groupId))?.group.restSeconds).toBe(75);
  });

  test('ungroup and go back to the workout, but only when supersets are on', async () => {
    const { db, groupId } = await setup();
    const { user, unmount } = await open(db, groupId);
    await user.click(await screen.findByRole('button', { name: 'Ungroup' }));
    expect(navigation.push).toHaveBeenCalledWith('/workout');
    expect(await getWorkoutGroup(db, groupId)).toBeNull();
    unmount();

    const other = await setup({ supersets: false });
    await open(other.db, other.groupId);
    expect(await screen.findByRole('heading', { name: 'Round 1 · Curl' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ungroup' })).not.toBeInTheDocument();
  });

  test('save the superset as a saved superset', async () => {
    const { db, userId, ids, groupId } = await setup();
    await addSet(db, ids[0], values);
    const { user } = await open(db, groupId);

    await user.click(await screen.findByRole('button', { name: 'Save superset' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Saved as “Curl + Press”.');
    const [saved] = await listTemplates(db, userId, 'superset');
    expect(saved.exercises.map((item) => [item.name, item.targetSets, item.restSeconds])).toEqual([
      ['Curl', 1, 60],
      ['Press', null, 60],
    ]);
  });

  test('hide Save superset when templates are off', async () => {
    const { db, groupId } = await setup({ templates: false });
    await open(db, groupId);

    expect(await screen.findByRole('heading', { name: 'Round 1 · Curl' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save superset' })).not.toBeInTheDocument();
  });

  test('prefill from the saved superset’s targets when an exercise has no last time', async () => {
    const { db, userId, ids, groupId } = await setup();
    await addSet(db, ids[0], { ...values, weightGrams: 25000, reps: 6 });
    const templateId = await saveGroupAsTemplate(db, userId, groupId, 'Arms');
    await deleteWorkout(db, (await getWorkoutGroup(db, groupId))!.group.workoutId);
    const workout = await startWorkout(db, userId);
    const [curl] = await addTemplateToWorkout(db, workout.id, templateId);
    const copied = (await listWorkoutExercises(db, workout.id)).find((item) => item.id === curl)!;
    navigation.params = new URLSearchParams({ id: copied.groupId! });
    await renderWithDatabase(<GroupView />, { db });

    const form = await screen.findByRole('region', { name: 'Next set' });
    expect(within(form).getByRole('textbox', { name: 'Weight (kg)' })).toHaveValue('25');
    expect(within(form).getByRole('textbox', { name: 'Reps' })).toHaveValue('6');
  });

  test('say so when the superset does not exist', async () => {
    navigation.params = new URLSearchParams({ id: 'unknown' });
    await renderWithDatabase(<GroupView />);
    expect(await screen.findByText('This superset does not exist.')).toBeInTheDocument();
  });
});
