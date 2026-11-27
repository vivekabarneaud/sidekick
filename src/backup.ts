import { Directory, File } from 'expo-file-system';
import { db, getSetting, setSetting } from './db';
import { ensureRunTable } from './runs';
import { ensureStepTable } from './steps';

/**
 * The backup. All the data of Sidekick goes into one JSON file: the
 * exercises, the logs, the settings, the step samples, and the run events.
 * The file is small (no photos), so the app makes it in one step.
 *
 * - Automatic: the user selects a folder one time (for example, a folder in
 *   "Documents"). The Google Drive app does not let apps select its folders.
 *   Then Sidekick writes a new file there when the data
 *   changes. It keeps one file for each of the last KEEP days.
 * - Restore: the user selects a backup file. Sidekick adds the data that is
 *   not already there. It never deletes or replaces data. Thus, a restore of
 *   the same file two times is not a problem.
 *
 * Sidekick sends the file nowhere. The user selects the folder.
 */

const APP = 'sidekick';
const VERSION = 1;
const PREFIX = 'sidekick-backup-';
const KEEP = 3;

/** The settings of the backup itself. They are not in the backup. */
const KEY_FOLDER = 'backup_folder';
const KEY_LAST = 'backup_last';
const KEY_PRINT = 'backup_fingerprint';
const KEY_ERROR = 'backup_error';
export const KEY_ASKED = 'backup_asked';

type Row = Record<string, string | number | null>;

type BackupFile = {
  app: typeof APP;
  version: number;
  exportedAt: number;
  exercises: Row[];
  logs: Row[];
  settings: Row[];
  step_samples: Row[];
  run_events: Row[];
};

/** The tables of the steps and the runs can be missing if the user never started to count. */
async function rows(sql: string): Promise<Row[]> {
  const d = await db();
  try {
    return await d.getAllAsync<Row>(sql);
  } catch {
    return [];
  }
}

async function build(): Promise<BackupFile> {
  return {
    app: APP,
    version: VERSION,
    exportedAt: Date.now(),
    exercises: await rows('SELECT * FROM exercises ORDER BY id'),
    logs: await rows('SELECT * FROM logs ORDER BY id'),
    settings: await rows("SELECT * FROM settings WHERE key NOT LIKE 'backup\\_%' ESCAPE '\\'"),
    step_samples: await rows('SELECT at, counter, boot FROM step_samples ORDER BY at'),
    run_events: await rows('SELECT at, kind FROM run_events ORDER BY at'),
  };
}

/**
 * A short text that changes when the data changes. If it did not change
 * since the last backup, Sidekick does not write a new file.
 */
async function fingerprint(): Promise<string> {
  const parts = await Promise.all([
    rows('SELECT COUNT(*) AS n, MAX(updated_at) AS t FROM exercises'),
    rows('SELECT COUNT(*) AS n, MAX(id) AS t FROM logs'),
    rows('SELECT COUNT(*) AS n, MAX(at) AS t FROM step_samples'),
    rows('SELECT COUNT(*) AS n, MAX(at) AS t FROM run_events'),
  ]);
  return JSON.stringify(parts.map((p) => p[0] ?? null));
}

/** "2026-11-27-1430", in local time. */
function stamp(t: number) {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export type BackupStatus = {
  folder: string | null;
  /** The name of the folder, for the settings page. */
  folderName: string | null;
  last: number | null;
  error: string | null;
};

export async function backupStatus(): Promise<BackupStatus> {
  const folder = await getSetting(KEY_FOLDER);
  const last = await getSetting(KEY_LAST);
  let folderName: string | null = null;
  if (folder) {
    try {
      folderName = decodeURIComponent(new Directory(folder).name);
    } catch {
      folderName = null;
    }
  }
  return { folder, folderName, last: last ? Number(last) : null, error: await getSetting(KEY_ERROR) };
}

/**
 * The user selects a folder. Android keeps the permission after a restart.
 * Then Sidekick makes the first backup there immediately.
 * Returns false if the user cancelled.
 */
export async function chooseFolder(): Promise<boolean> {
  let dir: Directory;
  try {
    dir = await Directory.pickDirectoryAsync();
  } catch {
    return false; // The user closed the picker.
  }
  await setSetting(KEY_FOLDER, dir.uri);
  await backupNow();
  return true;
}

export async function stopAutomaticBackup() {
  const d = await db();
  await d.runAsync('DELETE FROM settings WHERE key IN (?, ?, ?)', KEY_FOLDER, KEY_PRINT, KEY_ERROR);
}

/**
 * The backup files to delete. Sidekick keeps the newest file of each of the
 * last KEEP days with a backup. Thus, there is always a copy from an earlier
 * day: if a problem in the data occurs today, the copy from yesterday does
 * not have it.
 *
 * The name of a file starts with its date ("sidekick-backup-2026-11-27-1430").
 * Android can add " (1)" to a name, so we use only the date and the time.
 */
function toDelete(entries: (File | Directory)[]): File[] {
  const files = entries
    .filter((f): f is File => f instanceof File && f.name.startsWith(PREFIX) && f.name.endsWith('.json'))
    .sort((a, b) => b.name.localeCompare(a.name)); // newest first
  const keptDays = new Set<string>();
  const out: File[] = [];
  for (const f of files) {
    const day = f.name.slice(PREFIX.length, PREFIX.length + 10);
    if (!keptDays.has(day) && keptDays.size < KEEP) keptDays.add(day);
    else out.push(f);
  }
  return out;
}

/**
 * Writes a new backup file in the folder, then deletes the old files (see
 * toDelete). Sidekick never writes over a backup file. Thus, if a write
 * stops in the middle, the older files are still correct.
 */
export async function backupNow(): Promise<void> {
  const folder = await getSetting(KEY_FOLDER);
  if (!folder) throw new Error('No backup folder.');
  try {
    const data = await build();
    const dir = new Directory(folder);
    const file = dir.createFile(`${PREFIX}${stamp(data.exportedAt)}.json`, 'application/json');
    file.write(JSON.stringify(data));

    for (const f of toDelete(dir.list())) {
      try {
        f.delete();
      } catch {
        // An old file that stays is not a problem.
      }
    }

    await setSetting(KEY_LAST, String(data.exportedAt));
    await setSetting(KEY_PRINT, await fingerprint());
    const d = await db();
    await d.runAsync('DELETE FROM settings WHERE key = ?', KEY_ERROR);
  } catch (e) {
    // The folder can stop to work: the user deleted it, or Android removed
    // the permission. The settings page shows this, so it is not silent.
    await setSetting(KEY_ERROR, String(Date.now()));
    throw e;
  }
}

/**
 * Makes a backup if a folder is set and the data changed. Sidekick calls it
 * when the app goes to the background, and from the background task.
 */
export async function backupIfChanged(): Promise<void> {
  if (!(await getSetting(KEY_FOLDER))) return;
  if ((await getSetting(KEY_PRINT)) === (await fingerprint())) return;
  await backupNow();
}

export type Restored = { exercises: number; logs: number; samples: number; runs: number };

/**
 * The user selects a backup file. Sidekick adds the data that is not already
 * there. Returns null if the user cancelled.
 */
export async function restoreFromFile(): Promise<Restored | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (picked.canceled) return null;
  const text = await picked.result.text();

  let data: BackupFile;
  try {
    data = JSON.parse(text) as BackupFile;
  } catch {
    throw new Error('Sidekick cannot read this file. Select a file with a name that starts with "sidekick-backup".');
  }
  if (data.app !== APP || !Array.isArray(data.exercises) || !Array.isArray(data.logs)) {
    throw new Error('This file is not a Sidekick backup.');
  }
  if (data.version > VERSION) {
    throw new Error('This backup comes from a newer version of Sidekick. Update Sidekick first.');
  }
  return merge(data);
}

async function merge(data: BackupFile): Promise<Restored> {
  const d = await db();
  const done: Restored = { exercises: 0, logs: 0, samples: 0, runs: 0 };

  // Make sure that the tables of the steps and the runs exist.
  await ensureStepTable();
  await ensureRunTable();

  await d.withTransactionAsync(async () => {
    // The ids in the backup can be different from the ids on this phone.
    // An exercise is the same if its name and its creation time are the same.
    const ids = new Map<number, number>();
    for (const e of data.exercises) {
      const found = await d.getFirstAsync<{ id: number }>(
        'SELECT id FROM exercises WHERE name = ? AND created_at = ?',
        e.name,
        e.created_at,
      );
      if (found) {
        ids.set(Number(e.id), found.id);
        continue;
      }
      // The backup has no photos. A card with a photo gets the first letter of its name.
      const photo = e.image_kind === 'photo';
      const r = await d.runAsync(
        `INSERT INTO exercises (name, measure, library_key, image_kind, image_uri, color, hidden, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        e.name,
        e.measure,
        e.library_key ?? null,
        photo ? 'none' : (e.image_kind ?? 'none'),
        photo ? null : (e.image_uri ?? null),
        e.color,
        e.hidden ?? 0,
        e.created_at,
        e.updated_at,
      );
      ids.set(Number(e.id), r.lastInsertRowId);
      done.exercises += 1;
    }

    for (const l of data.logs) {
      const exercise = ids.get(Number(l.exercise_id));
      if (exercise === undefined) continue;
      const found = await d.getFirstAsync(
        'SELECT id FROM logs WHERE exercise_id = ? AND logged_at = ?',
        exercise,
        l.logged_at,
      );
      if (found) continue;
      await d.runAsync(
        'INSERT INTO logs (exercise_id, sets, reps, seconds, logged_at) VALUES (?, ?, ?, ?, ?)',
        exercise,
        l.sets ?? 1,
        l.reps ?? null,
        l.seconds ?? null,
        l.logged_at,
      );
      done.logs += 1;
    }

    // A setting on this phone stays. A setting from the backup comes only if it is missing.
    for (const st of data.settings ?? []) {
      if (typeof st.key !== 'string' || st.key.startsWith('backup_')) continue;
      await d.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', st.key, st.value);
    }

    for (const sm of data.step_samples ?? []) {
      const found = await d.getFirstAsync('SELECT id FROM step_samples WHERE at = ?', sm.at);
      if (found) continue;
      await d.runAsync('INSERT INTO step_samples (at, counter, boot) VALUES (?, ?, ?)', sm.at, sm.counter, sm.boot);
      done.samples += 1;
    }

    for (const ev of data.run_events ?? []) {
      const found = await d.getFirstAsync('SELECT id FROM run_events WHERE at = ? AND kind = ?', ev.at, ev.kind);
      if (found) continue;
      await d.runAsync('INSERT INTO run_events (at, kind) VALUES (?, ?)', ev.at, ev.kind);
      done.runs += 1;
    }
  });
  return done;
}
