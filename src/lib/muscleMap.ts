// The muscle map (4b.13, decision 046): our own drawing of the body, front and back, with one area per
// muscle group of the exercise library. Pure data and functions: no database, no React.

export type BodySide = 'front' | 'back';

// One area of the drawing. `muscleGroup` is the muscle group key ("lower back"); without it the
// area is a plain part of the body (head, hands, knees, feet). Areas left of the center line are
// drawn again mirrored on the right; `center` areas sit on the center line and are drawn once.
export type BodyArea = { d: string; muscleGroup?: string; center?: boolean };

// Small muscle groups are hard to tap, so an invisible band this wide (in drawing units) around them
// takes taps too. It lies on top of the neighbors, which are large enough to keep most of their area.
export const TAP_MARGIN: Record<string, number> = {
  neck: 10,
  traps: 14,
  abductors: 12,
  adductors: 12,
};

// The drawing's coordinates; the body fills 26–134 across and 4–336 down.
export const BODY_VIEW_BOX = '26 4 108 332';
export const BODY_WIDTH = 160;

const HEAD = 'M80 8 C89 8 93 15 93 24 C93 34 87 40 80 40 C73 40 67 34 67 24 C67 15 71 8 80 8 Z';
const FOREARM = 'M38 126 Q31 145 33 166 L41 167 Q48 147 49 124 Z';
const HAND = 'M33 169 L41 169 L42 182 Q37 187 32 181 Z';
const FOOT = 'M57 321 L67 321 L70 333 L53 333 Z';

export const BODY_AREAS: Record<BodySide, BodyArea[]> = {
  front: [
    { d: HEAD, center: true },
    { muscleGroup: 'neck', d: 'M73 39 Q80 41.5 87 39 L89 50 L71 50 Z', center: true },
    { muscleGroup: 'traps', d: 'M71 48 Q64 54 55 57 L70 57 Z' },
    { muscleGroup: 'shoulders', d: 'M55 58 Q42 59 39 72 Q39 84 44 90 Q47 75 55.5 66 Z' },
    { muscleGroup: 'chest', d: 'M60 60 Q68 58 79 60 L79 88 Q66 93 53 86 Q51 73 60 60 Z' },
    { muscleGroup: 'biceps', d: 'M43 92 Q37 104 38 120 Q43 126 48 121 Q51 106 48 92 Z' },
    { muscleGroup: 'forearms', d: FOREARM },
    { d: HAND },
    { d: 'M53 90 Q55 118 64 148 L68 150 L68 94 Q60 93 53 90 Z' },
    { muscleGroup: 'abdominals', d: 'M69 93 L91 93 L90 148 Q80 155 70 148 Z', center: true },
    { muscleGroup: 'abductors', d: 'M57 151 Q50 161 51 178 L55 176 Q56 163 60 154 Z' },
    { muscleGroup: 'quadriceps', d: 'M61 155 Q51 188 56 228 Q63 236 70 232 Q72 200 71 166 Z' },
    { muscleGroup: 'adductors', d: 'M72 158 L79 164 L78 212 Q73 204 72 182 Z' },
    { d: 'M57 236 Q64 233 71 236 L70 248 Q64 251 57 248 Z' },
    { muscleGroup: 'calves', d: 'M56 252 Q52 280 58 318 L66 318 Q72 282 70 252 Z' },
    { d: FOOT },
  ],
  back: [
    { d: HEAD, center: true },
    { muscleGroup: 'neck', d: 'M73 39 Q80 41.5 87 39 L88 46 L80 44 L72 46 Z', center: true },
    { muscleGroup: 'shoulders', d: 'M55 58 Q42 60 39 73 Q40 85 45 90 Q48 75 57 64 Z' },
    { muscleGroup: 'triceps', d: 'M43 92 Q37 106 39 124 L48 122 Q51 106 48 92 Z' },
    { muscleGroup: 'forearms', d: FOREARM },
    { d: HAND },
    { muscleGroup: 'lats', d: 'M55 70 L63 70 L67 102 L74 116 Q67 122 60 121 Q53 100 55 70 Z' },
    { muscleGroup: 'middle back', d: 'M64 68 L77 102 L77 116 L68 104 Z' },
    { muscleGroup: 'traps', d: 'M80 44 Q70 50 56 58 L66 64 L80 100 L94 64 L104 58 Q90 50 80 44 Z', center: true },
    { muscleGroup: 'lower back', d: 'M69 122 L91 122 L92 148 L68 148 Z', center: true },
    { muscleGroup: 'abductors', d: 'M56 149 Q50 158 53 172 L57.5 166 L59 152 Z' },
    { muscleGroup: 'glutes', d: 'M61 150 Q55 172 63 186 Q74 191 79 182 L79 150 Z' },
    { muscleGroup: 'hamstrings', d: 'M58 192 Q51 214 57 238 L70 238 Q75 214 74 192 Z' },
    { muscleGroup: 'adductors', d: 'M75 194 L79 196 L78 232 Q73 220 75 194 Z' },
    { d: 'M57 241 Q64 238 71 241 L70 250 Q64 253 57 250 Z' },
    { muscleGroup: 'calves', d: 'M56 253 Q49 275 57 298 Q63 304 68 298 Q75 275 70 253 Z' },
    { d: 'M58 301 L68 301 L66 320 L58 320 Z' },
    { d: FOOT },
  ],
};

// Every muscle group key the drawing shows.
export const MAPPED_MUSCLE_GROUPS: string[] = [
  ...new Set(
    [...BODY_AREAS.front, ...BODY_AREAS.back].flatMap((area) => (area.muscleGroup ? [area.muscleGroup] : [])),
  ),
];

export const HEAT_STEPS = 5;

// The shade of a muscle group: 0 when it got nothing, otherwise 1–5 relative to the most trained one,
// so the most trained muscle group always has the darkest shade.
export function heatLevel(value: number, top: number): number {
  if (value <= 0 || top <= 0) return 0;
  return Math.min(HEAT_STEPS, Math.max(1, Math.ceil((value / top) * HEAT_STEPS)));
}

// The interface name of a muscle group key without a stored name: "lower back" → "Lower back".
export function muscleGroupLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}
