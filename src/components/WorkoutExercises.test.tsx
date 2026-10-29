import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { exercises, workoutExercises } from '@/db/schema';
import { getLocalSettings, updateSettings } from '@/db/settings';
import { addWorkoutExercise, listWorkoutExercises, startWorkout } from '@/db/workouts';
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
