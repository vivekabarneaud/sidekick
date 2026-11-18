/**
 * The drawings of the library exercises, in a 48 × 48 box. "body" is the
 * figure. "dim" is the floor, the wall, or the chair, with lighter lines.
 * The keys are the keys of assets/library.json.
 *
 * The source of these drawings is the design canvas "Sidekick UI"
 * (screen E). Change them there first, then copy them here.
 */

export type Glyph = { dim: string; body: string };

/** A circle as a path: two half arcs. */
function o(x: number, y: number, r: number) {
  return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
}

const FLOOR = 'M4 42H44';
const LOW = 'M4 41H44';
const ONE_LEG = 'M24 13V28M24 28V42M24 28L29 35M29 35L35 32M24 16L14 21M24 16L34 21';

export const GLYPHS: Record<string, Glyph> = {
  'wall-push-up': { dim: FLOOR + 'M38 6V42', body: o(30, 13, 3.5) + 'M12 42L27 18M27 18L38 21' },
  'sit-to-stand': {
    dim: FLOOR + 'M6 28H18M6 28V42M18 28V42M6 28V14',
    body: o(28, 10, 3.5) + 'M27 15L24 27M24 27L32 31M32 31L31 42M26 18L36 22',
  },
  'seated-leg-lift': {
    dim: FLOOR + 'M10 28H24M10 28V42M24 28V42M10 28V12',
    body: o(16, 9, 3.5) + 'M16 14V27M16 27H26M26 27L39 23M16 17L23 23',
  },
  'glute-bridge': { dim: LOW, body: o(7, 35, 3.5) + 'M12 38L24 27M24 27L33 25M33 25L36 39M12 38L20 39' },
  'wall-sit': { dim: FLOOR + 'M8 6V42', body: o(14, 9, 3.5) + 'M14 14V28M14 28H28M28 28V42M14 17L24 20' },
  'knee-plank': { dim: LOW, body: o(8, 24, 3.5) + 'M13 28L34 39M34 39L42 34M13 28V39M13 39H6' },
  'calf-raise': {
    dim: FLOOR,
    body:
      o(20, 8, 3.5) +
      'M20 13V28M20 28L18 38M20 28L22 38M18 38L16 41M22 38L24 41M20 16L14 24M20 16L26 24M34 38V24M30 28L34 24L38 28',
  },
  'standing-march': {
    dim: FLOOR,
    body: o(22, 8, 3.5) + 'M22 13V27M22 27V42M22 27L31 26M31 26L30 36M22 16L15 23M22 16L29 20',
  },
  'shoulder-blade-squeeze': {
    dim: FLOOR,
    body: o(24, 9, 3.5) + 'M24 14V31M24 31L19 42M24 31L29 42M24 17L15 21M15 21L13 12M24 17L33 21M33 21L35 12',
  },
  'chin-tuck': { dim: 'M10 38C14 35 26 35 30 38', body: o(20, 18, 7) + 'M19 25V35M41 18H32M35 15L32 18L35 21' },
  'bird-dog': { dim: LOW, body: o(11, 22, 3.5) + 'M16 26H30M16 26V41M30 26V41M30 41H38M16 26L5 30M30 26L44 23' },
  'dead-bug': { dim: LOW, body: o(8, 35, 3.5) + 'M12 37H26M14 37L17 23M26 37L30 27M30 27H38M26 37L42 33' },
  'arm-circles': {
    dim: FLOOR + o(7, 17, 4) + o(41, 17, 4),
    body: o(24, 9, 3.5) + 'M24 14V30M24 30L20 42M24 30L28 42M24 17H12M24 17H36',
  },
  'heel-slide': { dim: LOW, body: o(7, 35, 3.5) + 'M11 37H24M24 37H42M24 37L31 28M31 28L36 38' },
  'side-leg-lift': { dim: LOW, body: o(8, 31, 3.5) + 'M12 35L26 37M26 37L43 39M26 37L41 26M12 35L9 40' },
  'single-leg-stand': { dim: FLOOR, body: o(24, 8, 3.5) + ONE_LEG },
  'bicycle-crunch': { dim: LOW, body: o(9, 27, 3.5) + 'M13 31L24 38M24 38L28 28M28 28H36M24 38L42 33M13 31L21 28' },
  clamshell: {
    dim: LOW,
    body: o(8, 30, 3.5) + 'M12 35L24 36M24 36L34 39M34 39L27 40M24 36L32 27M32 27L27 40M12 35L9 40',
  },
  'single-leg-hip-raise': {
    dim: LOW,
    body: o(7, 35, 3.5) + 'M12 38L24 27M24 27L33 25M33 25L36 39M12 38L20 39M24 27L42 22',
  },
  plank: { dim: LOW, body: o(8, 24, 3.5) + 'M13 28L42 39M13 28V39M13 39H6' },
  'standing-cross-toe-touch': {
    dim: FLOOR,
    body: o(20, 8, 3.5) + 'M20 13V27M20 27V42M20 27L37 20M20 16L35 19M20 16L12 5',
  },
  squat: { dim: FLOOR, body: o(22, 9, 3.5) + 'M21 14L18 27M18 27L29 29M29 29L26 42M21 17L34 19' },
  'sumo-squat': {
    dim: FLOOR,
    body:
      o(24, 8, 3.5) +
      'M24 13V27M24 27L14 30M14 30L12 42M24 27L34 30M34 30L36 42M24 17L18 21L24 23M24 17L30 21L24 23',
  },
  'single-leg-stand-eyes-closed': {
    dim: FLOOR,
    body: o(24, 8, 3.5) + ONE_LEG + 'M31 6Q35 9 39 6M32 8L31 10M35 9V11M38 8L39 10',
  },
};
