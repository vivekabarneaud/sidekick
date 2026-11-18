import { getSetting, setSetting } from './db';

export type Measure = 'reps' | 'time' | 'reps_time';

export const MEASURES: { key: Measure; label: string; hint: string }[] = [
  { key: 'reps', label: 'Reps', hint: 'For example: 8 wall push-ups' },
  { key: 'time', label: 'Time held', hint: 'For example: a plank of 20 s' },
  { key: 'reps_time', label: 'Reps and time held', hint: 'For example: 5 bridges, 3 s each' },
];

/**
 * The two settings change only the panel. They do not change the data, so
 * the old logs stay correct when the user changes a setting.
 */
export type InputSettings = {
  /** 'per_rep': the user types the seconds for each rep. 'total': the total seconds. */
  holdInput: 'per_rep' | 'total';
  /** true: the panel shows the "sets" field. */
  sets: boolean;
};

export const DEFAULT_SETTINGS: InputSettings = { holdInput: 'per_rep', sets: false };

export async function loadSettings(): Promise<InputSettings> {
  const [hold, sets] = await Promise.all([getSetting('hold_input'), getSetting('sets')]);
  return {
    holdInput: hold === 'total' ? 'total' : DEFAULT_SETTINGS.holdInput,
    sets: sets === null ? DEFAULT_SETTINGS.sets : sets === '1',
  };
}

export async function saveSettings(s: InputSettings) {
  await setSetting('hold_input', s.holdInput);
  await setSetting('sets', s.sets ? '1' : '0');
}

/** "45 s", "2 min", "2 min 05 s". */
export function formatSeconds(total: number): string {
  if (total < 60) return `${total} s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m} min` : `${m} min ${String(s).padStart(2, '0')} s`;
}
