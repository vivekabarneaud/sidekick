/**
 * Date helpers in local time. They use setDate() and not "+ 24 hours", so
 * the changes to and from summer time do not move the days.
 */

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(t: number, days: number): number {
  const d = new Date(t);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** The week starts on Monday. */
export function startOfWeek(t: number): number {
  const d = new Date(startOfDay(t));
  const fromMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - fromMonday);
  return d.getTime();
}

export function startOfMonth(t: number): number {
  const d = new Date(startOfDay(t));
  d.setDate(1);
  return d.getTime();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "3 Nov". */
export function shortDate(t: number): string {
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "3 Nov 2025" when the year is not the current year. */
export function longDate(t: number, now = Date.now()): string {
  const d = new Date(t);
  const same = d.getFullYear() === new Date(now).getFullYear();
  return same ? shortDate(t) : `${shortDate(t)} ${d.getFullYear()}`;
}
