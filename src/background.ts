import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { backupIfChanged } from './backup';
import { sampleAll, TASK } from './steps';

/**
 * The background task. Android runs it approximately every 15 minutes, also
 * when Sidekick is closed. It saves the steps and the runs, and makes the
 * automatic backup if the data changed.
 *
 * Import this file when the app starts (see app/_layout.tsx). Then the task
 * exists also when Android starts Sidekick only to run the task.
 */
TaskManager.defineTask(TASK, async () => {
  let ok = true;
  try {
    await sampleAll();
  } catch (e) {
    console.warn('Could not save the steps', e);
    ok = false;
  }
  try {
    await backupIfChanged();
  } catch (e) {
    console.warn('Could not make the backup', e);
    ok = false;
  }
  return ok ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Failed;
});
