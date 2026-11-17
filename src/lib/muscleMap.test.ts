import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { BODY_AREAS, BODY_WIDTH, MAPPED_MUSCLE_GROUPS, heatLevel, muscleGroupLabel, type BodySide } from './muscleMap';

type Point = [number, number];

// The outline of a path as a polygon: its M, L, Q, C and Z commands, curves cut into short lines.
function outline(d: string, steps = 16): Point[] {
  const tokens = d.match(/[MLQCZ]|-?\d+(?:\.\d+)?/g) ?? [];
  const points: Point[] = [];
  let i = 0;
  let command = '';
  let current: Point = [0, 0];
  const point = (): Point => [Number(tokens[i++]), Number(tokens[i++])];
  while (i < tokens.length) {
    if (/[MLQCZ]/.test(tokens[i])) command = tokens[i++];
    if (command === 'Z') continue;
    if (command === 'M' || command === 'L') {
      current = point();
      points.push(current);
    } else if (command === 'Q') {
      const [control, end, start] = [point(), point(), current];
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const u = 1 - t;
        points.push([u * u * start[0] + 2 * u * t * control[0] + t * t * end[0], u * u * start[1] + 2 * u * t * control[1] + t * t * end[1]]);
      }
      current = end;
    } else if (command === 'C') {
      const [c1, c2, end, start] = [point(), point(), point(), current];
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const u = 1 - t;
        const at = (n: 0 | 1) => u ** 3 * start[n] + 3 * u * u * t * c1[n] + 3 * u * t * t * c2[n] + t ** 3 * end[n];
        points.push([at(0), at(1)]);
      }
      current = end;
    }
  }
  return points;
}

function inside([x, y]: Point, polygon: Point[]): boolean {
  if (!polygon.some(([px]) => px >= x) || !polygon.some(([px]) => px <= x)) return false;
  let result = false;
  for (let k = 0, j = polygon.length - 1; k < polygon.length; j = k++) {
    const [x1, y1] = polygon[k];
    const [x2, y2] = polygon[j];
    if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) result = !result;
  }
  return result;
}

// Every drawn area of one side, the mirrored ones included, as named polygons.
function drawnAreas(side: BodySide): { name: string; polygon: Point[] }[] {
  return BODY_AREAS[side].flatMap((area, index) => {
    const name = `${area.muscleGroup ?? 'body'} ${index}`;
    const polygon = outline(area.d);
    const mirrored = polygon.map(([x, y]): Point => [BODY_WIDTH - x, y]);
    return area.center ? [{ name, polygon }] : [{ name, polygon }, { name: `${name} (right)`, polygon: mirrored }];
  });
}

describe('heatLevel', () => {
  test('give the most trained muscle group the darkest shade and spread the rest over 1–5', () => {
    expect(heatLevel(14, 14)).toBe(5);
    expect(heatLevel(7, 14)).toBe(3);
    expect(heatLevel(0.5, 14)).toBe(1);
  });

  test('leave a muscle group without sets untrained', () => {
    expect(heatLevel(0, 14)).toBe(0);
    expect(heatLevel(0, 0)).toBe(0);
  });
});

describe('the drawing', () => {
  test('have an area for every muscle group of the exercise library', () => {
    const library: { primaryMuscles: string[]; secondaryMuscles: string[] }[] = JSON.parse(
      readFileSync(join(process.cwd(), 'data/free-exercise-db/exercises.json'), 'utf8'),
    );
    const keys = new Set(library.flatMap((exercise) => [...exercise.primaryMuscles, ...exercise.secondaryMuscles]));

    expect([...keys].filter((key) => !MAPPED_MUSCLE_GROUPS.includes(key))).toEqual([]);
  });

  test('show the back muscle groups only on the back and the front ones only on the front', () => {
    const on = (side: 'front' | 'back') => new Set(BODY_AREAS[side].map((area) => area.muscleGroup));
    expect(on('front').has('chest')).toBe(true);
    expect(on('back').has('chest')).toBe(false);
    expect(on('back').has('lats')).toBe(true);
    expect(on('front').has('lats')).toBe(false);
  });

  // A grid of points every half unit: a point inside two areas means one area covers part of another
  // (5.2.3: the lower back covered the lats).
  test.each(['front', 'back'] as const)('draw no area over another on the %s', (side) => {
    const areas = drawnAreas(side).map((area) => {
      const ys = area.polygon.map(([, y]) => y);
      return { ...area, top: Math.min(...ys), bottom: Math.max(...ys) };
    });
    const overlaps = new Set<string>();
    for (let y = 4.25; y < 336; y += 0.5) {
      const row = areas.filter((area) => area.top <= y && y <= area.bottom);
      for (let x = 26.25; x < 134; x += 0.5) {
        const hits = row.filter((area) => inside([x, y], area.polygon)).map((area) => area.name);
        if (hits.length > 1) overlaps.add(hits.join(' + '));
      }
    }
    expect([...overlaps]).toEqual([]);
  });

  test('name a muscle group from its key', () => {
    expect(muscleGroupLabel('lower back')).toBe('Lower back');
  });
});
