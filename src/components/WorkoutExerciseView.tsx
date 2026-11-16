'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { getExerciseDetail, type ExerciseDetail } from '@/db/exercises';
import { PHASES, type Phase } from '@/db/schema';
import {
  addWorkoutExerciseWithSet,
  changeWorkoutExercisePhase,
  getActiveWorkout,
  getWorkoutExercise,
  listWorkoutExercises,
} from '@/db/workouts';
import { useExercisePreferences } from '@/hooks/useExercisePreferences';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { shortDescription } from '@/lib/exercises';
import { PHASE_LABELS, defaultPhase } from '@/lib/phases';
import type { SetValues } from '@/lib/sets';
import { getUnits } from '@/lib/units';
import ExercisePreferencesForm from './ExercisePreferencesForm';
import SetLog, { type SetLogItem } from './SetLog';
import Tabs, { tabPanelProps } from './Tabs';
import { useTabSwipe } from '@/hooks/useTabSwipe';
import BackLink from './BackLink';
import ExerciseImage from './ExerciseImage';

type Tab = 'log' | 'about';
const TABS: { value: Tab; label: string }[] = [
  { value: 'log', label: 'Log' },
  { value: 'about', label: 'About' },
];

type Loaded = {
  // `id` is null for an exercise that is not in the workout yet.
  item: SetLogItem & { workoutId: string };
  // Null when the exercise is no longer in the browser, such as a deleted custom exercise.
  detail: ExerciseDetail | null;
} | null;

// One workout exercise on its own page, in two tabs (decision 042): "Log" with the user's note, last
// time, the set form and the logged sets; "About" with the image, description, notes and units, and phase.
// The address holds the workout exercise (/workout/exercise?id=…) or, from the "Add exercise"
// page, an exercise (/workout/exercise?exercise=…). An exercise joins the active workout only
// when its first set is logged (decision 031); one already in the workout opens as it is.
export default function WorkoutExerciseView() {
  const db = useDatabase();
  const router = useRouter();
  const { settings } = useSettings();
  const features = useFeatures();
  const params = useSearchParams();
  const id = params.get('id');
  const exerciseId = params.get('exercise');
  const phasesOn = features.phases;
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('log');
  const swipe = useTabSwipe(TABS, tab, setTab);
  const { preferences, units, save } = useExercisePreferences(loaded?.item.exerciseId ?? null);

  useEffect(() => {
    let current = true;
    const load = async (): Promise<Loaded | 'redirected'> => {
      if (id) {
        const item = await getWorkoutExercise(db, id);
        return item ? { item, detail: await getExerciseDetail(db, settings.userId, item.exerciseId) } : null;
      }
      if (!exerciseId) return null;
      const workout = await getActiveWorkout(db, settings.userId);
      if (!workout) return null;
      const existing = (await listWorkoutExercises(db, workout.id)).find((item) => item.exerciseId === exerciseId);
      if (existing) {
        router.replace(`/workout/exercise?id=${existing.id}`);
        return 'redirected';
      }
      const detail = await getExerciseDetail(db, settings.userId, exerciseId);
      if (!detail) return null;
      const { exercise } = detail;
      const item: SetLogItem & { workoutId: string } = {
        id: null,
        workoutId: workout.id,
        exerciseId,
        name: exercise.name,
        position: 0,
        phase: defaultPhase(exercise.category, phasesOn),
        groupId: null,
        loadType: exercise.loadType,
        tracksReps: exercise.tracksReps,
        tracksDuration: exercise.tracksDuration,
        tracksDistance: exercise.tracksDistance,
        category: exercise.category,
        defaultDurationSeconds: exercise.defaultDurationSeconds,
      };
      return { item, detail };
    };
    load()
      .then((result) => current && result !== 'redirected' && setLoaded(result))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, router, settings.userId, id, exerciseId, phasesOn]);

  const pending = loaded?.item.id === null ? loaded.item : null;
  // The first set adds the exercise to the workout; the address then names the new workout exercise.
  const addWithFirstSet = useCallback(
    async (values: SetValues) => {
      if (!pending) return;
      const newId = await addWorkoutExerciseWithSet(db, pending.workoutId, pending.exerciseId, pending.phase, values);
      router.replace(`/workout/exercise?id=${newId}`);
    },
    [db, router, pending],
  );

  if (loaded === undefined) {
    return null;
  }
  const item = loaded?.item;
  const detail = loaded?.detail ?? null;
  const image = detail?.images[0];
  const primary = detail?.muscleGroups.filter((group) => group.role === 'primary').map((group) => group.name) ?? [];
  return (
    <main {...swipe} className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center gap-4">
        <BackLink href="/workout" label="Back to workout" />
        <h1 className="min-w-0 break-words text-2xl font-bold">{item?.name ?? 'Exercise'}</h1>
      </header>
      {!item ? (
        <p className="text-muted">This exercise is not in the workout.</p>
      ) : (
        <>
          <Tabs label="Exercise" tabs={TABS} value={tab} onChange={setTab} />
          {tab === 'log' ? (
            <div {...tabPanelProps('log')} className="flex flex-col gap-4">
              {preferences?.notes && (
                <p className="break-words text-sm">
                  <span className="text-muted">Note: </span>
                  {preferences.notes}
                </p>
              )}
              {item.id === null && <p className="text-sm text-muted">Log a set to add this exercise to the workout.</p>}
              {preferences !== undefined && (
                <SetLog
                  key={item.id ?? 'new'}
                  item={item}
                  workoutId={item.workoutId}
                  units={units}
                  onFirstSet={item.id === null ? addWithFirstSet : undefined}
                />
              )}
            </div>
          ) : (
            <div {...tabPanelProps('about')} className="flex flex-col gap-4">
              {detail && (
                <section aria-label="About the exercise" className="flex flex-col gap-2">
                  {features.exerciseImages && image && (
                    <ExerciseImage
                      path={image.path}
                      storedFile={image.storedFile}
                      alt={`${item.name}, image 1`}
                      width={400}
                      height={300}
                      className="aspect-[4/3] h-auto w-full rounded-lg object-cover"
                    />
                  )}
                  <p className="break-words text-sm text-muted">{shortDescription(detail.exercise, primary)}</p>
                  <Link href={`/exercises/detail?id=${detail.exercise.id}`} className="self-start text-sm text-link">
                    Exercise details and progress ›
                  </Link>
                </section>
              )}
              {preferences !== undefined && (
                <section aria-label="Notes and units" className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold uppercase text-muted">Notes and units</h2>
                  <ExercisePreferencesForm preferences={preferences} settingsUnits={getUnits(settings)} onSave={save} />
                </section>
              )}
              {features.phases && item.id !== null && (
                <label className="flex items-center gap-3 text-sm">
                  <span className="shrink-0 text-muted">Phase</span>
                  <select
                    value={item.phase}
                    onChange={async (event) => {
                      const phase = event.target.value as Phase;
                      if (item.id === null) return;
                      await changeWorkoutExercisePhase(db, item.id, phase);
                      setLoaded((current) => (current ? { ...current, item: { ...current.item, phase } } : current));
                    }}
                    className="min-w-0 flex-1 rounded-lg border px-3 py-2"
                  >
                    {PHASES.map((phase) => (
                      <option key={phase} value={phase}>
                        {PHASE_LABELS[phase]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
