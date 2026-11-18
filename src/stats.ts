import { addDays, startOfDay, startOfWeek } from './dates';
import type { Log } from './db';
import type { Measure } from './measure';

/**
 * All the calculations of the totals page. The functions only read the logs.
 * The database does not keep totals.
 */

export type Totals = { reps: number; seconds: number };

export function sum(logs: Log[]): Totals {
  let reps = 0;
  let seconds = 0;
  for (const l of logs) {
    reps += l.sets * (l.reps ?? 0);
    seconds += l.sets * (l.seconds ?? 0);
  }
  return { reps, seconds };
}

export function between(logs: Log[], from: number, to = Infinity): Log[] {
  return logs.filter((l) => l.logged_at >= from && l.logged_at < to);
}

/** The main number of an exercise: seconds for "time held", reps for the others. */
export function primary(measure: Measure, t: Totals): number {
  return measure === 'time' ? t.seconds : t.reps;
}

/** The start (Monday) of the last n weeks. The current week is last. */
export function weekStarts(n: number, now: number): number[] {
  const current = startOfWeek(now);
  return Array.from({ length: n }, (_, i) => addDays(current, -7 * (n - 1 - i)));
}

export function weekly(logs: Log[], starts: number[]): Totals[] {
  return starts.map((s, i) => sum(between(logs, s, starts[i + 1] ?? addDays(s, 7))));
}

export function activeDays(logs: Log[], from: number): number {
  const days = new Set<number>();
  for (const l of logs) if (l.logged_at >= from) days.add(startOfDay(l.logged_at));
  return days.size;
}

/**
 * The current week is not finished. Thus, we compare "Monday to now" with the
 * same days and hours 4 weeks ago. Then the comparison is fair also on a Monday.
 */
export function sameDaysWeeksAgo(logs: Log[], now: number, weeks = 4) {
  const from = startOfWeek(now);
  return {
    now: sum(between(logs, from, now + 1)),
    before: sum(between(logs, addDays(from, -7 * weeks), addDays(now, -7 * weeks) + 1)),
  };
}

export type Best = { value: number; at: number } | null;

/** The best result in one set. */
export function bests(logs: Log[]) {
  let reps: Best = null;
  let seconds: Best = null;
  let holdPerRep: Best = null;
  for (const l of logs) {
    if (l.reps !== null && (!reps || l.reps > reps.value)) reps = { value: l.reps, at: l.logged_at };
    if (l.seconds !== null && (!seconds || l.seconds > seconds.value)) {
      seconds = { value: l.seconds, at: l.logged_at };
    }
    if (l.reps && l.seconds !== null) {
      const per = Math.round(l.seconds / l.reps);
      if (!holdPerRep || per > holdPerRep.value) holdPerRep = { value: per, at: l.logged_at };
    }
  }
  return { reps, seconds, holdPerRep };
}
