import * as SQLite from 'expo-sqlite';
import type { Measure } from './measure';

export type ImageKind = 'glyph' | 'photo' | 'none';

export type Exercise = {
  id: number;
  name: string;
  measure: Measure;
  library_key: string | null;
  image_kind: ImageKind;
  image_uri: string | null;
  color: string;
  hidden: number;
  created_at: number;
  updated_at: number;
};

/**
 * One log. "reps" is for each set. "seconds" is the total time held in each
 * set. The totals of a log are sets × reps and sets × seconds.
 */
export type Log = {
  id: number;
  exercise_id: number;
  sets: number;
  reps: number | null;
  seconds: number | null;
  logged_at: number;
};

let handle: Promise<SQLite.SQLiteDatabase> | null = null;
function db() {
  if (!handle) handle = SQLite.openDatabaseAsync('sidekick.db');
  return handle;
}

export async function init() {
  const d = await db();
  await d.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS exercises (
      id          INTEGER PRIMARY KEY NOT NULL,
      name        TEXT NOT NULL,
      measure     TEXT NOT NULL,
      library_key TEXT,
      image_kind  TEXT NOT NULL DEFAULT 'none',
      image_uri   TEXT,
      color       TEXT NOT NULL,
      hidden      INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id          INTEGER PRIMARY KEY NOT NULL,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id),
      sets        INTEGER NOT NULL DEFAULT 1,
      reps        INTEGER,
      seconds     INTEGER,
      logged_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_logs_exercise_time ON logs(exercise_id, logged_at);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

/** A card with the totals since a given time (usually the start of today). */
export type ExerciseRow = Exercise & { reps_since: number; seconds_since: number };

/**
 * The visible cards. The card with the most recent log is first. A card
 * without logs comes after the cards with logs, newest card first.
 */
export async function listExercises(since: number): Promise<ExerciseRow[]> {
  const d = await db();
  return d.getAllAsync<ExerciseRow>(
    `
    SELECT e.*,
           COALESCE(t.reps, 0)    AS reps_since,
           COALESCE(t.seconds, 0) AS seconds_since
    FROM exercises e
    LEFT JOIN (SELECT exercise_id, MAX(logged_at) AS last FROM logs GROUP BY exercise_id) l
      ON l.exercise_id = e.id
    LEFT JOIN (
      SELECT exercise_id,
             SUM(sets * COALESCE(reps, 0))    AS reps,
             SUM(sets * COALESCE(seconds, 0)) AS seconds
      FROM logs WHERE logged_at >= ? GROUP BY exercise_id
    ) t ON t.exercise_id = e.id
    WHERE e.hidden = 0
    ORDER BY l.last IS NULL, l.last DESC, e.created_at DESC
  `,
    since,
  );
}

export async function countExercises(): Promise<number> {
  const d = await db();
  const row = await d.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM exercises');
  return row?.n ?? 0;
}

export async function createExercise(e: {
  name: string;
  measure: Measure;
  library_key: string | null;
  image_kind: ImageKind;
  color: string;
}): Promise<number> {
  const d = await db();
  const now = Date.now();
  const r = await d.runAsync(
    `INSERT INTO exercises (name, measure, library_key, image_kind, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    e.name,
    e.measure,
    e.library_key,
    e.image_kind,
    e.color,
    now,
    now,
  );
  return r.lastInsertRowId;
}

export async function lastLog(exerciseId: number): Promise<Log | null> {
  const d = await db();
  return d.getFirstAsync<Log>(
    'SELECT * FROM logs WHERE exercise_id = ? ORDER BY logged_at DESC LIMIT 1',
    exerciseId,
  );
}

export async function addLog(l: Omit<Log, 'id' | 'logged_at'>): Promise<number> {
  const d = await db();
  const r = await d.runAsync(
    'INSERT INTO logs (exercise_id, sets, reps, seconds, logged_at) VALUES (?, ?, ?, ?, ?)',
    l.exercise_id,
    l.sets,
    l.reps,
    l.seconds,
    Date.now(),
  );
  return r.lastInsertRowId;
}

export async function deleteLog(id: number) {
  const d = await db();
  await d.runAsync('DELETE FROM logs WHERE id = ?', id);
}

export async function getSetting(key: string): Promise<string | null> {
  const d = await db();
  const row = await d.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const d = await db();
  await d.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}
