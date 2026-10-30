import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { ExercisePreferences } from '@/db/schema';
import ExercisePreferencesForm from './ExercisePreferencesForm';

const settingsUnits = { weightUnit: 'kg', distanceUnit: 'metric' } as const;

function renderForm(preferences: Partial<ExercisePreferences> | null = null) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <ExercisePreferencesForm
      preferences={preferences as ExercisePreferences | null}
      settingsUnits={settingsUnits}
      onSave={onSave}
    />,
  );
  return { user: userEvent.setup(), onSave };
}

test('save notes and a unit override', async () => {
  const { user, onSave } = renderForm();

  await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'Seat at 4.');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Weight unit' }), 'lb');
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(onSave).toHaveBeenCalledWith({ notes: 'Seat at 4.', weightUnit: 'lb', distanceUnit: null });
  expect(screen.getByRole('status')).toHaveTextContent('Saved');
});

test('show the saved values and clear the override with "Same as settings"', async () => {
  const { user, onSave } = renderForm({ notes: 'Old machine', weightUnit: 'lb', distanceUnit: 'imperial' });

  expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('Old machine');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Weight unit' }), 'Same as settings: kg');
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(onSave).toHaveBeenCalledWith({ notes: 'Old machine', weightUnit: null, distanceUnit: 'imperial' });
});
