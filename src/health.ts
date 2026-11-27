import type * as HC from 'react-native-health-connect';
import { addDays, startOfDay } from './dates';

/**
 * Sidekick reads the steps and the runs from Health Connect. Health Connect
 * is the store for health data on the Android phone. The phone, a watch, or
 * an app like Samsung Health puts the data there. Sidekick only reads it.
 * The data stays on the phone.
 */

/**
 * Expo Go does not contain the native module. Thus, we load the module here
 * and not with "import". Then the other pages work also in Expo Go.
 */
function load(): typeof HC | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-health-connect') as typeof HC;
  } catch {
    return null;
  }
}

const hc = load();

const PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  // Without this permission, Health Connect gives only the last 30 days.
  { accessType: 'read', recordType: 'ReadHealthDataHistory' },
] as const;

/**
 * - 'missing': the app runs in Expo Go. Expo Go does not contain Health Connect.
 * - 'install': the phone does not have Health Connect (Android 13 and older).
 * - 'update': the phone must update Health Connect.
 * - 'off': Health Connect is there, but the user did not give the permission.
 * - 'on': Sidekick can read the steps.
 */
export type HealthState = 'missing' | 'install' | 'update' | 'off' | 'on';

let ready = false;

async function start(): Promise<HealthState> {
  if (!hc) return 'missing';
  const status = await hc.getSdkStatus();
  if (status === hc.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'update';
  if (status !== hc.SdkAvailabilityStatus.SDK_AVAILABLE) return 'install';
  if (!ready) ready = await hc.initialize();
  return ready ? 'off' : 'missing';
}

function canReadSteps(granted: { accessType: string; recordType: string }[]) {
  return granted.some((p) => p.accessType === 'read' && p.recordType === 'Steps');
}

export async function healthState(): Promise<HealthState> {
  try {
    const s = await start();
    if (s !== 'off' || !hc) return s;
    return canReadSteps(await hc.getGrantedPermissions()) ? 'on' : 'off';
  } catch (e) {
    console.warn('Could not read the state of Health Connect', e);
    return 'missing';
  }
}

/** Shows the permission page of Health Connect. */
export async function connect(): Promise<HealthState> {
  const s = await start();
  if (s !== 'off' || !hc) return s;
  const granted = await hc.requestPermission([...PERMISSIONS]);
  return canReadSteps(granted) ? 'on' : 'off';
}

export function openSettings() {
  hc?.openHealthConnectSettings();
}

function range(from: number, to: number) {
  return {
    operator: 'between' as const,
    startTime: new Date(from).toISOString(),
    endTime: new Date(to).toISOString(),
  };
}

/**
 * The steps from "from" to "to". Two sources (for example, the phone and a
 * watch) can record the same steps. Health Connect removes the duplicates in
 * an aggregate. Thus, we use an aggregate and do not add the records ourselves.
 */
async function steps(from: number, to: number): Promise<number> {
  if (!hc) return 0;
  const r = await hc.aggregateRecord({ recordType: 'Steps', timeRangeFilter: range(from, to) });
  return r.COUNT_TOTAL ?? 0;
}

/** The steps for each week. "starts" is the Monday of each week. */
export function weeklySteps(starts: number[], now: number): Promise<number[]> {
  return Promise.all(
    starts.map((s, i) => steps(s, Math.min(starts[i + 1] ?? addDays(s, 7), now))),
  );
}

export function stepsToday(now: number): Promise<number> {
  return steps(startOfDay(now), now);
}

export type Run = { start: number; minutes: number };

/** The runs that a phone, a watch, or a sports app recorded in Health Connect. */
export async function runs(from: number, to: number): Promise<Run[]> {
  if (!hc) return [];
  const running: number[] = [hc.ExerciseType.RUNNING, hc.ExerciseType.RUNNING_TREADMILL];
  const out: Run[] = [];
  let pageToken: string | undefined;
  do {
    const page = await hc.readRecords('ExerciseSession', { timeRangeFilter: range(from, to), pageToken });
    for (const r of page.records) {
      if (!running.includes(r.exerciseType)) continue;
      const start = Date.parse(r.startTime);
      out.push({ start, minutes: Math.round((Date.parse(r.endTime) - start) / 60000) });
    }
    pageToken = page.pageToken || undefined;
  } while (pageToken);
  return out;
}
