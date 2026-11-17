'use client';

import type { WeekBar } from '@/lib/statistics';

type Props = {
  weeks: WeekBar[];
  value: (week: WeekBar) => number;
  format: (value: number) => string;
  label: string;
};

const BOX = { width: 320, height: 140, top: 16, bottom: 20 };
const weekLabel = (date: Date) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date);

// One bar per week, oldest on the left, with the highest value on top and the first and last week below.
export default function WeeklyBars({ weeks, value, format, label }: Props) {
  if (weeks.length === 0) return null;
  const values = weeks.map(value);
  const top = Math.max(...values);
  const slot = BOX.width / weeks.length;
  const barWidth = Math.max(2, slot * 0.7);
  const inner = BOX.height - BOX.top - BOX.bottom;
  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} role="img" aria-label={label} className="w-full">
        <line x1={0} y1={BOX.height - BOX.bottom} x2={BOX.width} y2={BOX.height - BOX.bottom} className="stroke-line-strong" strokeWidth={1} />
        {top > 0 && (
          <text x={0} y={10} className="fill-muted" fontSize={10}>
            {format(top)}
          </text>
        )}
        {values.map((v, index) => {
          const height = top > 0 ? (v / top) * inner : 0;
          return (
            <rect
              key={weeks[index].weekStart.getTime()}
              x={index * slot + (slot - barWidth) / 2}
              y={BOX.height - BOX.bottom - height}
              width={barWidth}
              height={height}
              rx={1.5}
              className="fill-primary"
            />
          );
        })}
        <text x={0} y={BOX.height - 6} className="fill-muted" fontSize={10}>
          {weekLabel(weeks[0].weekStart)}
        </text>
        <text x={BOX.width} y={BOX.height - 6} textAnchor="end" className="fill-muted" fontSize={10}>
          {weekLabel(weeks.at(-1)!.weekStart)}
        </text>
      </svg>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {weeks.map((week, index) => (
            <tr key={week.weekStart.getTime()}>
              <td>Week of {weekLabel(week.weekStart)}</td>
              <td>{format(values[index])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
