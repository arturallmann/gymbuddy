'use client';

import { useState } from 'react';
import { formatWorkoutDate } from '@/lib/dates';
import { METRIC_LABELS, chartCoordinates, formatMetric, type ChartPoint, type Metric } from '@/lib/progress';
import type { Units } from '@/lib/units';

type Props = {
  metrics: Metric[];
  pointsFor: (metric: Metric) => ChartPoint[];
  units: Units;
};

const BOX = { width: 320, height: 180, padding: 16 };

// The chart view: one value per workout over time, for weight, reps, volume, duration or distance.
export default function ExerciseChart({ metrics, pointsFor, units }: Props) {
  const [metric, setMetric] = useState<Metric>(metrics[0]);
  const [selected, setSelected] = useState<number | null>(null);
  const points = pointsFor(metric);
  const coordinates = chartCoordinates(points, BOX);
  const shown = selected !== null ? points[selected] : points.at(-1);
  const top = points.length > 0 ? Math.max(...points.map((point) => point.value)) : null;

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Chart value" className="flex flex-wrap gap-2">
        {metrics.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === metric}
            onClick={() => {
              setMetric(option);
              setSelected(null);
            }}
            className={`rounded-full border px-3 py-1 text-sm ${option === metric ? 'border-sky-600 bg-sky-600 text-white' : ''}`}
          >
            {METRIC_LABELS[option]}
          </button>
        ))}
      </div>
      {points.length === 0 ? (
        <p className="text-gray-500">No values to chart yet.</p>
      ) : (
        <>
          {shown && (
            <p role="status" className="text-sm">
              <span className="text-gray-500">{formatWorkoutDate(shown.startedAt)}: </span>
              <span className="font-semibold">{formatMetric(shown.value, metric, units)}</span>
            </p>
          )}
          <svg
            viewBox={`0 0 ${BOX.width} ${BOX.height}`}
            role="img"
            aria-label={`${METRIC_LABELS[metric]} per workout`}
            className="w-full rounded-lg border"
          >
            <line x1={BOX.padding} y1={BOX.height - BOX.padding} x2={BOX.width - BOX.padding} y2={BOX.height - BOX.padding} className="stroke-gray-500" strokeWidth={1} />
            {top !== null && (
              <text x={BOX.padding} y={BOX.padding - 4} className="fill-gray-500" fontSize={10}>
                {formatMetric(top, metric, units)}
              </text>
            )}
            <polyline
              points={coordinates.map(({ x, y }) => `${x},${y}`).join(' ')}
              fill="none"
              className="stroke-sky-600"
              strokeWidth={2}
            />
            {coordinates.map(({ x, y }, index) => (
              <circle
                key={points[index].workoutId}
                cx={x}
                cy={y}
                r={index === selected ? 6 : 4}
                className="cursor-pointer fill-sky-600"
                onClick={() => setSelected(index)}
              />
            ))}
          </svg>
          <table className="sr-only">
            <caption>{METRIC_LABELS[metric]} per workout</caption>
            <tbody>
              {points.map((point) => (
                <tr key={point.workoutId}>
                  <td>{formatWorkoutDate(point.startedAt)}</td>
                  <td>{formatMetric(point.value, metric, units)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
