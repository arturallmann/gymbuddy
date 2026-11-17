import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { exercises } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { listTemplates } from '@/db/templates';
import { addWorkoutExercise, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import SaveRoutine from './SaveRoutine';

async function setup(templatesOn: boolean) {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const workout = await startWorkout(db, userId, new Date(2026, 9, 29, 9, 0));
  const exerciseId = crypto.randomUUID();
  await db.insert(exercises).values({ id: exerciseId, userId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external' });
  await addWorkoutExercise(db, workout.id, exerciseId);
  const rendered = await renderWithDatabase(<SaveRoutine workoutId={workout.id} startedAt={workout.startedAt} />, {
    db,
    settings: { features: { templates: templatesOn } },
  });
  return { ...rendered, userId };
}

test('save the workout as a routine named after its weekday', async () => {
  const { db, user, userId } = await setup(true);

  await user.click(screen.getByRole('button', { name: 'Save as routine' }));
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(
    `${new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(new Date(2026, 9, 29))} routine`,
  );
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByRole('link', { name: 'Routines' })).toHaveAttribute('href', '/routines');
  const [routine] = await listTemplates(db, userId, 'routine');
  expect(routine.exercises.map((item) => item.name)).toEqual(['Squat']);
});

test('hide Save as routine when templates are off', async () => {
  await setup(false);
  expect(screen.queryByRole('button', { name: 'Save as routine' })).not.toBeInTheDocument();
});
