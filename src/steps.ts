import { PermissionsAndroid, Platform } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Motion } from '../modules/motion';
import { db } from './db';
import { saveRunEvents } from './runs';

/**
 * Sidekick counts the steps itself, with the step sensor of the phone.
 *
 * The sensor counts all the time, also when Sidekick is closed. Its value is
 * the number of steps since the last start of the phone. Sidekick saves this
 * value (a "sample") when it opens, and in the background approximately every
 * 15 minutes. The steps between two samples are the difference of the two
 * values. Like the logs, the samples are the main data: the app calculates
 * all the step totals from them.
 *
 * Sidekick counts from the first sample. It has no steps from before.
 *
 * The same permission ("Physical activity") and the same background task
 * also record the runs (see runs.ts).
 */

export type Sample = { at: number; counter: number; boot: number };

const TASK = 'sidekick-step-sample';

/** Two samples with a boot time closer than this come from the same start of the phone. */
const SAME_BOOT = 5 * 60 * 1000;

/**
 * - 'missing': the app runs in Expo Go, or the phone has no step sensor.
 * - 'off': the user did not give the permission "Physical activity".
 * - 'on': Sidekick counts the steps.
 */
export type StepsState = 'missing' | 'off' | 'on';

// Android 9 and older do not ask for this permission. The sensor then works without it.
const NEEDS_PERMISSION = Platform.OS === 'android' && Number(Platform.Version) >= 29;

async function ensureTable() {
  // The background task can run without the root layout. Thus, it cannot
  // trust init() in db.ts, and makes the table itself.
  const d = await db();
  await d.execAsync(`
    CREATE TABLE IF NOT EXISTS step_samples (
      id      INTEGER PRIMARY KEY NOT NULL,
      at      INTEGER NOT NULL,
      counter INTEGER NOT NULL,
      boot    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_step_samples_at ON step_samples(at);
  `);
  return d;
}

export async function stepsState(): Promise<StepsState> {
  if (!Motion || !Motion.hasStepSensor()) return 'missing';
  if (!NEEDS_PERMISSION) return 'on';
  const ok = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
  return ok ? 'on' : 'off';
}

/** Asks for the permission "Physical activity" and starts to count. */
export async function startCounting(): Promise<StepsState> {
  if (!Motion || !Motion.hasStepSensor()) return 'missing';
  if (NEEDS_PERMISSION) {
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
    if (r !== PermissionsAndroid.RESULTS.GRANTED) return 'off';
  }
  await keepCounting();
  return 'on';
}

/**
 * Saves a sample of the steps and the new run events now, and makes sure
 * that the background task runs. Call it when the app opens.
 */
export async function keepCounting() {
  if ((await stepsState()) !== 'on') return;
  await sampleAll();
  if (!(await TaskManager.isTaskRegisteredAsync(TASK))) {
    await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 });
  }
}

/**
 * The steps, and the runs. The request for the runs stops after a restart
 * of the phone. Thus, we make it again each time.
 */
async function sampleAll() {
  await sample();
  await Motion?.watchRuns();
  await saveRunEvents();
}

/** Reads the sensor and saves the value. */
export async function sample() {
  if (!Motion) return;
  const value = await Motion.readSteps();
  if (!value) return;
  const d = await ensureTable();
  await d.runAsync(
    'INSERT INTO step_samples (at, counter, boot) VALUES (?, ?, ?)',
    Date.now(),
    Math.round(value.steps),
    Math.round(value.boot),
  );
}

/** The samples from "from" until now, plus the last sample before "from". */
export async function samplesSince(from: number): Promise<Sample[]> {
  const d = await ensureTable();
  return d.getAllAsync<Sample>(
    `SELECT at, counter, boot FROM step_samples
     WHERE at >= COALESCE((SELECT MAX(at) FROM step_samples WHERE at < ?), 0)
     ORDER BY at`,
    from,
  );
}

export async function firstSampleAt(): Promise<number | null> {
  const d = await ensureTable();
  const r = await d.getFirstAsync<{ at: number | null }>('SELECT MIN(at) AS at FROM step_samples');
  return r?.at ?? null;
}

/** The steps between two samples. */
function stepsBetweenSamples(a: Sample, b: Sample): number {
  const sameBoot = Math.abs(a.boot - b.boot) < SAME_BOOT && b.counter >= a.counter;
  // After a new start of the phone, the sensor starts again from 0. Then all
  // the steps of b come after the start. The steps between a and the start
  // of the phone are lost.
  return sameBoot ? b.counter - a.counter : b.counter;
}

/**
 * The steps from "from" to "to". We do not know when the steps between two
 * samples occurred. Thus, if the time between two samples is partly in the
 * range, we count the same part of the steps.
 */
export function stepsIn(samples: Sample[], from: number, to: number): number {
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    const start = Math.max(a.at, from);
    const end = Math.min(b.at, to);
    if (end <= start || b.at <= a.at) continue;
    total += (stepsBetweenSamples(a, b) * (end - start)) / (b.at - a.at);
  }
  return Math.round(total);
}

// The background task. Android runs it approximately every 15 minutes, also
// when Sidekick is closed. This file must be imported when the app starts
// (see app/_layout.tsx), so that the task exists also for a run in the
// background.
TaskManager.defineTask(TASK, async () => {
  try {
    await sampleAll();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.warn('Could not save the steps', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
