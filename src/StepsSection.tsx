import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { longDate, startOfWeek } from './dates';
import {
  connect,
  healthState,
  openSettings,
  runs,
  stepsToday,
  weeklySteps,
  type HealthState,
  type Run,
} from './health';
import { weekStarts } from './stats';
import { c } from './theme';
import { WeeklyColumns } from './WeeklyColumns';

const WEEKS = 8;
const PLAY_STORE = 'market://details?id=com.google.android.apps.healthdata';

type Data = { today: number; weeks: number[]; starts: number[]; runs: Run[]; now: number };

const n = (v: number) => v.toLocaleString('en-GB');

/** The steps and the runs from Health Connect, at the top of the totals page. */
export function StepsSection() {
  const [state, setState] = useState<HealthState | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (s: HealthState) => {
    setState(s);
    if (s !== 'on') return;
    const now = Date.now();
    const starts = weekStarts(WEEKS, now);
    try {
      const [today, weeks, r] = await Promise.all([
        stepsToday(now),
        weeklySteps(starts, now),
        runs(startOfWeek(now), now),
      ]);
      setData({ today, weeks, starts, runs: r, now });
      setFailed(false);
    } catch (e) {
      console.warn('Could not read the steps', e);
      setFailed(true);
    }
  }, []);

  // Read again each time that the page opens. The user can walk between two visits.
  useFocusEffect(
    useCallback(() => {
      void healthState().then(load);
    }, [load]),
  );

  const onConnect = async () => {
    try {
      await load(await connect());
    } catch (e) {
      console.warn('Could not ask for the permission', e);
    }
  };

  // Expo Go does not contain Health Connect. We show nothing.
  if (state === null || state === 'missing') return null;

  if (state !== 'on') {
    const text = {
      install: 'Sidekick reads your steps from Health Connect. Install Health Connect from the Play Store first.',
      update: 'Sidekick reads your steps from Health Connect. Update Health Connect from the Play Store first.',
      off: 'Sidekick can show your steps and your runs. It reads them from Health Connect, on your phone. Your data does not leave the phone.',
    }[state];
    const button =
      state === 'off'
        ? { label: 'Show my steps', onPress: onConnect }
        : { label: 'Open the Play Store', onPress: () => void Linking.openURL(PLAY_STORE) };
    return (
      <View style={s.section}>
        <Text style={s.title}>Steps</Text>
        <Text style={s.body}>{text}</Text>
        <Pressable style={s.button} onPress={button.onPress} accessibilityRole="button">
          <Text style={s.buttonText}>{button.label}</Text>
        </Pressable>
      </View>
    );
  }

  if (failed) {
    return (
      <View style={s.section}>
        <Text style={s.title}>Steps</Text>
        <Text style={s.body}>Sidekick cannot read your steps now. Your steps are not lost.</Text>
      </View>
    );
  }

  if (!data) return null;

  const week = data.weeks[data.weeks.length - 1];
  const runMinutes = data.runs.reduce((a, r) => a + r.minutes, 0);

  return (
    <View style={s.section}>
      <Text style={s.title}>Steps</Text>
      <View style={s.tiles}>
        <Tile label="Steps today" value={n(data.today)} />
        <Tile label="Steps this week" value={n(week)} />
      </View>

      {data.runs.length > 0 ? (
        <Text style={s.runs}>
          {data.runs.length === 1 ? '1 run' : `${data.runs.length} runs`} this week, {runMinutes} min in total
        </Text>
      ) : null}

      <Text style={s.chartTitle}>Steps each week, last {WEEKS} weeks</Text>
      <WeeklyColumns
        values={data.weeks}
        starts={data.starts}
        format={(v) => (v < 10000 ? n(v) : `${Math.round(v / 1000)}k`)}
        label={`Steps each week. ${data.weeks
          .map((v, i) => `Week of ${longDate(data.starts[i], data.now)}: ${n(v)} steps`)
          .join('. ')}`}
      />

      <Pressable onPress={openSettings} accessibilityRole="button" hitSlop={8}>
        <Text style={s.link}>Change the permissions in Health Connect</Text>
      </Pressable>
    </View>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={s.tileValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  section: { backgroundColor: c.surface, borderRadius: 20, padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: c.ink },
  body: { fontSize: 15, lineHeight: 22, color: c.muted },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingHorizontal: 18,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: { color: c.accentInk, fontSize: 16, fontWeight: '700' },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, gap: 4 },
  tileLabel: { fontSize: 13, color: c.muted },
  tileValue: { fontSize: 28, fontWeight: '700', color: c.ink },
  runs: { fontSize: 15, color: c.ink },
  chartTitle: { fontSize: 13, color: c.muted, marginTop: 4 },
  link: { fontSize: 14, color: c.accent, fontWeight: '600' },
});
