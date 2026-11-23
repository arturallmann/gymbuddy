'use client';

import type { KeyboardEvent } from 'react';
import { BODY_AREAS, BODY_VIEW_BOX, BODY_WIDTH, HEAT_STEPS, TAP_MARGIN, heatLevel, muscleGroupLabel, type BodySide } from '@/lib/muscleMap';

type Props = {
  // The value of each muscle group, by muscle group key, such as sets per week.
  values: Map<string, number>;
  // What the values are, for the legend and screen readers: "8 sets per week".
  format: (value: number) => string;
  // Names by muscle group key; without one the key is shown with a capital letter.
  names?: Map<string, string>;
  selected: string | null;
  onSelect: (key: string | null) => void;
};

// Static class names, so Tailwind keeps them.
const FILLS = ['fill-heat-0', 'fill-heat-1', 'fill-heat-2', 'fill-heat-3', 'fill-heat-4', 'fill-heat-5'];
const SWATCHES = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4', 'bg-heat-5'];
const MIRROR = `matrix(-1 0 0 1 ${BODY_WIDTH} 0)`;

// The muscle map (4b.13, decision 046): the body from the front and the back, side by side, each muscle
// group shaded by its value in the "warm clay" colors, the darkest for the most trained one.
// A tap on a muscle group chooses it; a second tap clears the choice.
export default function MuscleMap({ values, format, names, selected, onSelect }: Props) {
  const top = Math.max(0, ...values.values());
  const name = (key: string) => names?.get(key) ?? muscleGroupLabel(key);

  const side = (view: BodySide) => {
    const draw = (mirrored: boolean) =>
      BODY_AREAS[view]
        .filter((area) => !mirrored || !area.center)
        .map((area, index) => {
          const key = area.muscleGroup;
          if (!key) return <path key={index} d={area.d} className="fill-line" />;
          const value = values.get(key) ?? 0;
          const choose = () => onSelect(selected === key ? null : key);
          return (
            <path
              key={index}
              d={area.d}
              role="button"
              tabIndex={mirrored ? -1 : 0}
              aria-hidden={mirrored || undefined}
              aria-label={`${name(key)}, ${format(value)}`}
              aria-pressed={selected === key}
              onClick={choose}
              onKeyDown={(event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  choose();
                }
              }}
              className={`cursor-pointer stroke-page outline-none ${FILLS[heatLevel(value, top)]}`}
              strokeWidth={1}
            />
          );
        });
    // The outline of the chosen muscle group, drawn above every area so no neighbor covers it.
    const outline = (mirrored: boolean) =>
      BODY_AREAS[view]
        .filter((area) => selected && area.muscleGroup === selected && (!mirrored || !area.center))
        .map((area, index) => (
          <path
            key={`outline-${index}`}
            d={area.d}
            data-outline={area.muscleGroup}
            fill="none"
            strokeWidth={1.6}
            strokeLinejoin="round"
            pointerEvents="none"
            className="stroke-ink"
          />
        ));
    // Wider invisible tap areas around small muscle groups, drawn last so they lie on top.
    const tapAreas = (mirrored: boolean) =>
      BODY_AREAS[view]
        .filter((area) => area.muscleGroup && TAP_MARGIN[area.muscleGroup] && (!mirrored || !area.center))
        .map((area, index) => {
          const key = area.muscleGroup!;
          return (
            <path
              key={`tap-${index}`}
              d={area.d}
              data-tap-area={key}
              aria-hidden
              fill="transparent"
              stroke="transparent"
              strokeWidth={TAP_MARGIN[key]}
              strokeLinejoin="round"
              pointerEvents="all"
              className="cursor-pointer"
              onClick={() => onSelect(selected === key ? null : key)}
            />
          );
        });
    return (
      <figure className="flex max-w-32 flex-1 flex-col items-center gap-1">
        <svg viewBox={BODY_VIEW_BOX} role="group" aria-label={`${view === 'front' ? 'Front' : 'Back'} of the body`} className="h-auto w-full">
          <g>{draw(false)}</g>
          <g transform={MIRROR}>{draw(true)}</g>
          <g>{tapAreas(false)}</g>
          <g transform={MIRROR}>{tapAreas(true)}</g>
          <g>{outline(false)}</g>
          <g transform={MIRROR}>{outline(true)}</g>
        </svg>
        <figcaption className="text-xs text-muted">{view === 'front' ? 'Front' : 'Back'}</figcaption>
      </figure>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center gap-2">
        {side('front')}
        {side('back')}
      </div>
      <div aria-hidden className="flex items-center justify-center gap-1 text-xs text-muted">
        <span>0</span>
        {Array.from({ length: HEAT_STEPS + 1 }, (_, step) => (
          <span key={step} className={`h-2.5 w-4 rounded-sm ${SWATCHES[step]}`} />
        ))}
        <span>{format(top)}</span>
      </div>
    </div>
  );
}
