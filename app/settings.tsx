import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  backupNow,
  backupStatus,
  chooseFolder,
  restoreFromFile,
  stopAutomaticBackup,
  type BackupStatus,
} from '../src/backup';
import { longDate } from '../src/dates';
import { c } from '../src/theme';

/** "27 Nov at 14:30". */
function when(t: number) {
  return `${longDate(t)} at ${new Date(t).toTimeString().slice(0, 5)}`;
}

function message(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** The settings page. It has only the backup for now. */
export default function SettingsPage() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    void backupStatus().then(setStatus);
  }, []);
  useFocusEffect(load);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
      load();
    }
  }

  const onChoose = () =>
    run(async () => {
      try {
        await chooseFolder();
      } catch (e) {
        Alert.alert('The backup did not work', message(e));
      }
    });

  const onNow = () =>
    run(async () => {
      try {
        await backupNow();
        Alert.alert('Backup done', 'Sidekick saved a copy of your data in the folder.');
      } catch (e) {
        Alert.alert('The backup did not work', `${message(e)}\n\nSelect the folder again.`);
      }
    });

  const onStop = () =>
    Alert.alert(
      'Stop the automatic backup?',
      'The backup files that are already in the folder stay there.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', onPress: () => void run(stopAutomaticBackup) },
      ],
    );

  const onRestore = () =>
    run(async () => {
      try {
        const r = await restoreFromFile();
        if (!r) return;
        const added = r.exercises + r.logs + r.samples + r.runs;
        Alert.alert(
          'Restore done',
          added === 0
            ? 'All the data in this backup is already in Sidekick.'
            : `Sidekick added ${r.exercises} cards, ${r.logs} logs, ${r.samples} step values, and ${r.runs} run events.`,
        );
      } catch (e) {
        Alert.alert('The restore did not work', message(e));
      }
    });

  return (
    <View style={[s.page, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={s.back}>‹ Back</Text>
        </Pressable>
        <Text style={s.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 32 }]}>
        <View style={s.section}>
          <Text style={s.h2}>Backup</Text>
          <Text style={s.text}>
            Your data is only on this phone. Sidekick can keep a copy in a folder that you select, for example a
            folder "Sidekick" in "Documents". The copy stays when you remove the app. Thus, you can restore your
            data after you install Sidekick again.
          </Text>

          {status?.folder ? (
            <>
              <Text style={s.text}>
                <Text style={s.strong}>Automatic backup: on.</Text> Sidekick makes a copy when your data changes,
                and keeps one copy for each of the last 3 days.
              </Text>
              <Text style={s.text}>Folder: {status.folderName ?? 'selected'}</Text>
              <Text style={s.text}>
                Last backup: {status.last ? when(status.last) : 'not yet'}
              </Text>
              {status.error ? (
                <Text style={s.problem}>
                  The last backup did not work. Select the folder again, or push "Back up now".
                </Text>
              ) : null}
              <Button label="Back up now" onPress={onNow} disabled={busy} />
              <Button label="Select another folder" onPress={onChoose} disabled={busy} quiet />
              <Button label="Stop the automatic backup" onPress={onStop} disabled={busy} quiet />
            </>
          ) : (
            <>
              <Text style={s.text}>
                <Text style={s.strong}>Automatic backup: off.</Text>
              </Text>
              <Button label="Select a backup folder" onPress={onChoose} disabled={busy} />
            </>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Restore</Text>
          <Text style={s.text}>
            Select a backup file (its name starts with "sidekick-backup"). Sidekick adds the data that is not already
            here. It does not delete or replace your data.
          </Text>
          <Button label="Restore from a backup" onPress={onRestore} disabled={busy} quiet />
        </View>
      </ScrollView>
    </View>
  );
}

function Button({
  label,
  onPress,
  disabled,
  quiet,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  quiet?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [s.button, quiet && s.quiet, (pressed || disabled) && s.pressed]}
    >
      <Text style={[s.buttonText, quiet && s.quietText]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.ground },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 4, gap: 8 },
  back: { fontSize: 16, color: c.accent, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '800', color: c.ink },
  body: { padding: 14, gap: 14 },
  section: { backgroundColor: c.surface, borderRadius: 20, padding: 16, gap: 12 },
  h2: { fontSize: 18, fontWeight: '700', color: c.ink },
  text: { fontSize: 15, lineHeight: 22, color: c.muted },
  strong: { color: c.ink, fontWeight: '700' },
  problem: { fontSize: 15, lineHeight: 22, color: c.ink, fontWeight: '600' },
  button: {
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingHorizontal: 18,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: c.accentInk, fontSize: 16, fontWeight: '700' },
  quiet: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.hairline },
  quietText: { color: c.ink },
  pressed: { opacity: 0.6 },
});
