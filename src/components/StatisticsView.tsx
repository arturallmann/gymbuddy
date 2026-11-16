'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listStatistics } from '@/db/statistics';
import { useBodyweights } from '@/hooks/useBodyweights';
import { useSettings } from '@/hooks/useSettings';
import { firstDayOfWeek } from '@/lib/calendar';
import {
  PERSONAL_RECORD_LABELS,
  SPAN_LABELS,
  exerciseSummaries,
  formatPersonalRecord,
  formatSets,
  muscleGroupSummaries,
  spanRange,
  weeklyTotals,
  workoutTotals,
  type StatisticsInput,
  type StatisticsSpan,
} from '@/lib/statistics';
import { formatWeight, getUnits } from '@/lib/units';
import BackLink from './BackLink';
import BodyweightSection from './BodyweightSection';
import OptionGroup from './OptionGroup';
import Tabs, { tabPanelProps } from './Tabs';
import { useTabSwipe } from '@/hooks/useTabSwipe';
import WeeklyBars from './WeeklyBars';

type Tab = 'workouts' | 'exercises' | 'muscles' | 'bodyweight';
const TABS: { value: Tab; label: string }[] = [
  { value: 'workouts', label: 'Workouts' },
  { value: 'exercises', label: 'Exercises' },
  { value: 'muscles', label: 'Muscle groups' },
  { value: 'bodyweight', label: 'Bodyweight' },
];
const SPANS = (Object.keys(SPAN_LABELS) as StatisticsSpan[]).map((value) => ({ value, label: SPAN_LABELS[value] }));

const plural = (count: number, word: string) => `${formatSets(count)} ${word}${count === 1 ? '' : 's'}`;

// The statistics page (4b.12, decision 043): workouts, exercises and muscle groups over a time span,
// and the bodyweight. Opens from the home page menu with the statistics feature toggle.
export default function StatisticsView() {
  const db = useDatabase();
  const { settings } = useSettings();
  const { userId } = settings;
  const units = getUnits(settings);
  const { bodyweights } = useBodyweights();
  const [tab, setTab] = useState<Tab>('workouts');
  const swipe = useTabSwipe(TABS, tab, setTab);
  const [span, setSpan] = useState<StatisticsSpan>('4w');
  const [today] = useState(() => new Date());
  const [firstDay] = useState(() => firstDayOfWeek());
  const [loaded, setLoaded] = useState<{ span: StatisticsSpan; data: Awaited<ReturnType<typeof listStatistics>> } | null>(null);
  const range = spanRange(span, today);

  const from = range.from.getTime();
  const to = range.to.getTime();
  useEffect(() => {
    let current = true;
    listStatistics(db, userId, { from: new Date(from), to: new Date(to) })
      .then((data) => current && setLoaded({ span, data }))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, span, from, to]);

  const input: StatisticsInput | null =
    loaded?.span === span && bodyweights ? { ...loaded.data, bodyweights } : null;
  const weeks = Math.max(1, Math.round((to - from) / (7 * 24 * 3600 * 1000)));
  const volume = (grams: number) => formatWeight(grams, units.weightUnit);

  const workoutsPanel = (data: StatisticsInput) => {
    const totals = workoutTotals(data);
    const tiles = [
      { label: 'Workouts', value: String(totals.workouts) },
      { label: 'Per week', value: (totals.workouts / weeks).toFixed(1) },
      { label: 'Sets', value: String(totals.sets) },
      { label: 'Volume', value: totals.volume ? volume(totals.volume) : '–' },
    ];
    const bars = weeklyTotals(data, range, firstDay);
    return (
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="flex flex-col rounded-lg border border-line bg-surface p-3">
              <dt className="text-xs text-muted">{tile.label}</dt>
              <dd className="text-lg font-bold tabular-nums">{tile.value}</dd>
            </div>
          ))}
        </dl>
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase text-muted">Volume per week</h2>
          <WeeklyBars weeks={bars} value={(week) => week.volume} format={volume} label="Volume per week" />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase text-muted">Workouts per week</h2>
          <WeeklyBars weeks={bars} value={(week) => week.workouts} format={(v) => String(v)} label="Workouts per week" />
        </section>
      </div>
    );
  };

  const exercisesPanel = (data: StatisticsInput) => {
    const summaries = exerciseSummaries(data);
    return (
      <ul className="flex flex-col gap-2">
        {summaries.map(({ exercise, workouts, sets, volume: total, top }) => (
          <li key={exercise.id}>
            <Link href={`/exercises/detail?id=${exercise.id}`} className="flex flex-col rounded-lg border border-line bg-surface p-3">
              <span className="break-words font-semibold">{exercise.name}</span>
              <span className="text-sm text-muted">
                {plural(workouts, 'workout')} · {plural(sets, 'set')}
                {total ? ` · ${volume(total)}` : ''}
              </span>
              {top && (
                <span className="text-sm">
                  <span className="text-muted">{PERSONAL_RECORD_LABELS[top.kind]}: </span>
                  <span className="font-semibold tabular-nums">{formatPersonalRecord(top.kind, top.value, exercise.loadType, units)}</span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    );
  };

  const musclesPanel = (data: StatisticsInput) => {
    const summaries = muscleGroupSummaries(data);
    const top = Math.max(1, ...summaries.map((s) => s.primarySets + s.secondarySets));
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Sets per muscle group. A set counts 1 for a primary muscle group (dark) and ½ for a secondary one (light).
        </p>
        <ul className="flex flex-col gap-3">
          {summaries.map((group) => {
            const total = group.primarySets + group.secondarySets;
            return (
              <li key={group.id} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="flex-1 font-semibold capitalize">{group.name}</span>
                  <span className="text-sm tabular-nums">
                    {plural(total, 'set')} · {formatSets(Math.round((total / weeks) * 10) / 10)} per week
                  </span>
                </div>
                <div aria-hidden className="flex h-2.5 overflow-hidden rounded-full bg-line">
                  <span className="bg-primary" style={{ width: `${(group.primarySets / top) * 100}%` }} />
                  <span className="bg-primary/40" style={{ width: `${(group.secondarySets / top) * 100}%` }} />
                </div>
                <span className="text-xs text-muted">
                  {group.volume ? `${volume(group.volume)} · ` : ''}
                  {group.exercises.join(', ')}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <main {...swipe} className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-6">
      <header className="flex items-center gap-4">
        <BackLink href="/" label="Back" />
        <h1 className="text-2xl font-bold">Statistics</h1>
      </header>
      <Tabs label="Statistics" tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'bodyweight' ? (
        <div {...tabPanelProps('bodyweight')}>
          <BodyweightSection />
        </div>
      ) : (
        <div {...tabPanelProps(tab)} className="flex flex-col gap-4">
          <OptionGroup label="Time span" hideLabel options={SPANS} value={span} onChange={setSpan} />
          {input &&
            (input.rows.length === 0 ? (
              <p className="text-muted">No workouts in this time span.</p>
            ) : tab === 'workouts' ? (
              workoutsPanel(input)
            ) : tab === 'exercises' ? (
              exercisesPanel(input)
            ) : (
              musclesPanel(input)
            ))}
        </div>
      )}
    </main>
  );
}
