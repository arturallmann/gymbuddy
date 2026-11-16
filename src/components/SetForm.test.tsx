import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { DEFAULT_FEATURES, type FeatureToggles } from '@/db/schema';
import { setFormValues, type SetFormExercise } from '@/lib/sets';
import type { Units } from '@/lib/units';
import SetForm from './SetForm';

const kg: Units = { weightUnit: 'kg', distanceUnit: 'metric' };
const curl: SetFormExercise = { loadType: 'external', tracksReps: true, tracksDuration: false, tracksDistance: false };
const plank: SetFormExercise = { loadType: 'bodyweight', tracksReps: false, tracksDuration: true, tracksDistance: false };
const run: SetFormExercise = { loadType: 'none', tracksReps: false, tracksDuration: true, tracksDistance: true };
const off: FeatureToggles = { ...DEFAULT_FEATURES, rpe: false, setTypes: false, setNotes: false };
const on: FeatureToggles = { ...DEFAULT_FEATURES, rpe: true, setTypes: true, setNotes: true };

function renderForm(exercise: SetFormExercise, features = off, units = kg, onLog = vi.fn().mockResolvedValue(undefined)) {
  render(
    <SetForm exercise={exercise} units={units} features={features} initial={setFormValues(null, units)} onLog={onLog} />,
  );
  return { user: userEvent.setup(), onLog };
}

describe('SetForm', () => {
  test('show weight and reps for an external exercise', () => {
    renderForm(curl);

    expect(screen.getByRole('textbox', { name: 'Weight (kg)' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Reps' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Duration' })).not.toBeInTheDocument();
  });

  test('show added weight and duration for a bodyweight hold', () => {
    renderForm(plank, off, { weightUnit: 'lb', distanceUnit: 'imperial' });

    expect(screen.getByRole('textbox', { name: /Added weight \(lb\)/ })).toBeInTheDocument();
    expect(screen.getByText('Empty = bodyweight only. Negative = assisted.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Duration' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Reps' })).not.toBeInTheDocument();
  });

  test('show distance and duration, but no weight, when the load type is none', () => {
    renderForm(run);

    expect(screen.getByRole('textbox', { name: /Distance/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Distance unit' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Weight/ })).not.toBeInTheDocument();
  });

  test('hide RPE, set type and notes when their toggles are off', () => {
    renderForm(curl, off);

    expect(screen.queryByRole('textbox', { name: 'RPE' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Set type' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Notes' })).not.toBeInTheDocument();
  });

  test('log a set with RPE, set type and notes when their toggles are on', async () => {
    const { user, onLog } = renderForm(curl, on);

    await user.type(screen.getByRole('textbox', { name: 'Weight (kg)' }), '60');
    await user.type(screen.getByRole('textbox', { name: 'Reps' }), '8');
    await user.click(screen.getByRole('button', { name: /RPE, set type and notes/ }));
    await user.type(screen.getByRole('textbox', { name: 'RPE' }), '8,5');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Set type' }), 'Warm-up set');
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'slow');
    await user.click(screen.getByRole('button', { name: 'Log set' }));

    expect(onLog).toHaveBeenCalledWith({
      setType: 'warmup',
      weightGrams: 60000,
      reps: 8,
      durationSeconds: null,
      distanceMeters: null,
      rpe: 8.5,
      notes: 'slow',
    });
  });

  test('show what is wrong and log nothing', async () => {
    const { user, onLog } = renderForm(curl);

    await user.type(screen.getByRole('textbox', { name: 'Reps' }), 'many');
    await user.click(screen.getByRole('button', { name: 'Log set' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Reps must be a whole number.');
    expect(onLog).not.toHaveBeenCalled();
  });
});

test('use another button label and offer Cancel', async () => {
  const user = userEvent.setup();
  const onCancel = vi.fn();
  render(
    <SetForm
      exercise={curl}
      units={kg}
      features={off}
      initial={setFormValues(null, kg)}
      onLog={vi.fn()}
      submitLabel="Save set"
      onCancel={onCancel}
    />,
  );

  expect(screen.getByRole('button', { name: 'Save set' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Log set' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalledOnce();
});

describe('extra inputs', () => {
  const toggle = () => screen.getByRole('button', { name: /RPE, set type and notes/ });

  test('start closed for a new set and open on tap', async () => {
    const { user } = renderForm(curl, on);

    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('textbox', { name: 'RPE' })).not.toBeInTheDocument();
    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('textbox', { name: 'RPE' })).toBeInTheDocument();
  });

  test('start open when the set has notes, RPE or a set type', () => {
    render(
      <SetForm
        exercise={curl}
        units={kg}
        features={on}
        initial={{ ...setFormValues(null, kg), notes: 'belt' }}
        onLog={vi.fn()}
      />,
    );

    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  });

  test('leave the section out when the feature toggles hide all extra inputs', () => {
    renderForm(curl, off);

    expect(screen.queryByText(/set type/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /set type/i })).not.toBeInTheDocument();
  });
});

describe('− and + next to weight and reps', () => {
  test('change weight by 2.5 kg and reps by one, then log the set', async () => {
    const { user, onLog } = renderForm(curl);
    await user.type(screen.getByRole('textbox', { name: 'Weight (kg)' }), '100');
    await user.type(screen.getByRole('textbox', { name: 'Reps' }), '5');

    await user.click(screen.getByRole('button', { name: 'More weight' }));
    await user.click(screen.getByRole('button', { name: 'One rep less' }));

    expect(screen.getByRole('textbox', { name: 'Weight (kg)' })).toHaveValue('102.5');
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('4');
    await user.click(screen.getByRole('button', { name: 'Log set' }));
    expect(onLog).toHaveBeenCalledWith(expect.objectContaining({ weightGrams: 102500, reps: 4 }));
  });

  test('change weight by 5 lb, and let added weight go below 0 for assisted sets', async () => {
    const pullUp: SetFormExercise = { loadType: 'bodyweight', tracksReps: true, tracksDuration: false, tracksDistance: false };
    const { user } = renderForm(pullUp, off, { weightUnit: 'lb', distanceUnit: 'imperial' });

    await user.click(screen.getByRole('button', { name: 'Less weight' }));
    expect(screen.getByRole('textbox', { name: 'Added weight (lb)' })).toHaveValue('-5');
  });
});
