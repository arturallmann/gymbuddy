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
  formatSetCount,
  formatSets,
  muscleGroupSummaries,
  spanRange,
  weeklyTotals,
  workoutTotals,
  type MuscleGroupSummary,
  type StatisticsInput,
  type StatisticsSpan,
} from '@/lib/statistics';
import { formatWeight, getUnits } from '@/lib/units';
import BackLink from '@/components/ui/BackLink';
import BodyweightSection from './BodyweightSection';
import OptionGroup from '@/components/ui/OptionGroup';
import Tabs, { tabPanelProps } from '@/components/ui/Tabs';
import { useTabs } from '@/hooks/useTabs';
import WeeklyBars from './WeeklyBars';
import MuscleGroupCard from './MuscleGroupCard';
import MuscleMap from './MuscleMap';
import { useBackHandler } from '@/hooks/useBackHandler';

type Tab = 'workouts' | 'exercises' | 'muscles' | 'bodyweight';
const TABS: { value: Tab; label: string }[] = [
  { value: 'workouts', label: 'Workouts' },
  { value: 'exercises', label: 'Exercises' },
  { value: 'muscles', label: 'Muscle groups' },
  { value: 'bodyweight', label: 'Bodyweight' },
];
const MUSCLE_METRICS: { value: 'sets' | 'volume'; label: string }[] = [
  { value: 'sets', label: 'Sets per week' },
  { value: 'volume', label: 'Volume per week' },
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
  const { tab, changeTab, swipe, slide } = useTabs<Tab>(TABS, 'workouts');
  const [span, setSpan] = useState<StatisticsSpan>('4w');
  const [muscleMetric, setMuscleMetric] = useState<'sets' | 'volume'>('sets');
  const [muscle, setMuscle] = useState<string | null>(null);
  useBackHandler(muscle ? () => setMuscle(null) : null);
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

  // The muscle map (decision 046): sets or volume per week by muscle group, sets first.
  const musclesPanel = (data: StatisticsInput) => {
    const summaries = muscleGroupSummaries(data);
    const perWeek = (group: MuscleGroupSummary) =>
      (muscleMetric === 'sets' ? group.primarySets + group.secondarySets : group.volume) / weeks;
    const format = (value: number) =>
      muscleMetric === 'sets' ? `${formatSetCount(value)} per week` : `${volume(value)} per week`;
    return (
      <div className="flex flex-col gap-3">
        <OptionGroup label="Shade by" hideLabel options={MUSCLE_METRICS} value={muscleMetric} onChange={setMuscleMetric} />
        <MuscleMap
          values={new Map(summaries.map((group) => [group.key, perWeek(group)]))}
          names={new Map(summaries.map((group) => [group.key, group.name]))}
          format={format}
          selected={muscle}
          onSelect={setMuscle}
        />
        <MuscleGroupCard
          muscleGroup={muscle}
          summary={summaries.find((group) => group.key === muscle)}
          weeks={weeks}
          emptyText="No sets in this time span."
        />
        <p className="text-xs text-muted">A set counts 1 for a primary muscle group and ½ for a secondary one.</p>
      </div>
    );
  };

  return (
    <main {...swipe} className="mx-auto flex min-h-screen overflow-x-clip max-w-xl flex-col gap-4 p-6">
      <header className="flex items-center gap-4">
        <BackLink href="/" label="Back" />
        <h1 className="text-2xl font-bold">Statistics</h1>
      </header>
      <Tabs label="Statistics" tabs={TABS} value={tab} onChange={changeTab} />
      {tab === 'bodyweight' ? (
        <div {...tabPanelProps('bodyweight')} key={tab} className={slide}>
          <BodyweightSection />
        </div>
      ) : (
        <div {...tabPanelProps(tab)} key={tab} className={`flex flex-col gap-4 ${slide}`}>
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
