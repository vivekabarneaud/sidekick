import { Motion } from '../modules/motion';
import { db } from './db';

/**
 * The runs. Google's activity recognition tells the Android code when the
 * user starts and stops to run. The Android code keeps these events until
 * Sidekick takes them and saves them here. Like the logs, the events are the
 * main data: the app calculates the runs from them.
 */

type RunEvent = { at: number; kind: 'start' | 'end' };
export type Run = { start: number; minutes: number };

/** A run without an end after this time is an error of the detection. */
const MAX_RUN = 4 * 60 * 60 * 1000;
/** Shorter runs are usually an error of the detection, for example a run to catch a bus. */
const MIN_RUN = 2 * 60 * 1000;

export async function ensureRunTable() {
  // The background task can run without the root layout. Thus, it makes the table itself.
  const d = await db();
  await d.execAsync(`
    CREATE TABLE IF NOT EXISTS run_events (
      id   INTEGER PRIMARY KEY NOT NULL,
      at   INTEGER NOT NULL,
      kind TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_run_events_at ON run_events(at);
  `);
  return d;
}

/** Moves the new events from the Android code to the database. */
export async function saveRunEvents() {
  if (!Motion) return;
  const events = JSON.parse(Motion.takeRunEvents()) as RunEvent[];
  if (events.length === 0) return;
  const d = await ensureRunTable();
  await d.withTransactionAsync(async () => {
    for (const e of events) {
      await d.runAsync('INSERT INTO run_events (at, kind) VALUES (?, ?)', Math.round(e.at), e.kind);
    }
  });
}

/**
 * The runs that start between "from" and "to". A run is a start and the next
 * end. A run without an end yet (the user runs now) is not in the list.
 */
export async function runsBetween(from: number, to: number): Promise<Run[]> {
  const d = await ensureRunTable();
  const events = await d.getAllAsync<RunEvent>(
    'SELECT at, kind FROM run_events WHERE at >= ? AND at < ? ORDER BY at',
    from,
    to + MAX_RUN,
  );
  const out: Run[] = [];
  let start: number | null = null;
  for (const e of events) {
    if (e.kind === 'start') {
      start = e.at;
    } else if (start !== null) {
      const ms = e.at - start;
      if (start < to && ms >= MIN_RUN && ms <= MAX_RUN) out.push({ start, minutes: Math.round(ms / 60000) });
      start = null;
    }
  }
  return out;
}
