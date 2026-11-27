import { useCallback, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { addDays, longDate, startOfDay, startOfWeek } from './dates';
import { runsBetween, saveRunEvents, type Run } from './runs';
import { weekStarts } from './stats';
import { firstSampleAt, sample, samplesSince, startCounting, stepsIn, stepsState, type Sample, type StepsState } from './steps';
import { c } from './theme';
import { WeeklyColumns } from './WeeklyColumns';

const WEEKS = 8;

type Data = {
  today: number;
  weeks: number[];
  starts: number[];
  since: number | null;
  runs: Run[];
  now: number;
  /** Only for the development build: the samples of today. */
  debug: string;
};

const n = (v: number) => v.toLocaleString('en-GB');

/** The steps and the runs that Sidekick records, at the top of the totals page. */
export function StepsSection() {
  const [state, setState] = useState<StepsState | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (s: StepsState) => {
    setState(s);
    if (s !== 'on') return;
    try {
      // A new sample first. Then the total for today includes the last steps.
      await sample();
      await saveRunEvents();
      const now = Date.now();
      const starts = weekStarts(WEEKS, now);
      const samples = await samplesSince(starts[0]);
      setData({
        today: stepsIn(samples, startOfDay(now), now),
        weeks: starts.map((st) => stepsIn(samples, st, addDays(st, 7))),
        starts,
        since: await firstSampleAt(),
        runs: await runsBetween(startOfWeek(now), now),
        now,
        debug: debugText(samples, now),
      });
      setFailed(false);
    } catch (e) {
      console.warn('Could not read the steps', e);
      setFailed(true);
    }
  }, []);

  // Read again each time that the page opens. The user can walk between two visits.
  // Also read again when the app comes back to the front, and every minute
  // while the page is open.
  useFocusEffect(
    useCallback(() => {
      const reload = () => void stepsState().then(load);
      reload();
      const timer = setInterval(reload, 60 * 1000);
      const sub = AppState.addEventListener('change', (st) => {
        if (st === 'active') reload();
      });
      return () => {
        clearInterval(timer);
        sub.remove();
      };
    }, [load]),
  );

  const onStart = async () => {
    try {
      await load(await startCounting());
    } catch (e) {
      console.warn('Could not start to count the steps', e);
    }
  };

  // Expo Go, or a phone without a step sensor.
  if (state === null || state === 'missing') return null;

  if (state === 'off') {
    return (
      <View style={s.section}>
        <Text style={s.title}>Steps</Text>
        <Text style={s.body}>
          Sidekick can count your steps and find your runs. It starts when you push the button. This data does
          not leave the phone.
        </Text>
        <Pressable style={s.button} onPress={onStart} accessibilityRole="button">
          <Text style={s.buttonText}>Count my steps and runs</Text>
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
  const showSince = data.since !== null && data.since > data.starts[0];

  return (
    <View style={s.section}>
      <Text style={s.title}>Steps</Text>
      <View style={s.tiles}>
        <Tile label="Steps today" value={n(data.today)} />
        <Tile label="Steps this week" value={n(week)} />
      </View>

      <Text style={s.chartTitle}>Steps each week, last {WEEKS} weeks</Text>
      <WeeklyColumns
        values={data.weeks}
        starts={data.starts}
        format={(v) => (v < 10000 ? n(v) : `${Math.round(v / 1000)}k`)}
        label={`Steps each week. ${data.weeks
          .map((v, i) => `Week of ${longDate(data.starts[i], data.now)}: ${n(v)} steps`)
          .join('. ')}`}
      />
      {showSince ? <Text style={s.note}>Sidekick counts your steps since {longDate(data.since!, data.now)}.</Text> : null}

      <Runs list={data.runs} />
      {__DEV__ ? <Text style={s.note}>{data.debug}</Text> : null}
    </View>
  );
}

/** "Today: 5 samples. Last: 12,345 at 14:02." Shows in the development build only. */
function debugText(samples: Sample[], now: number) {
  const today = samples.filter((x) => x.at >= startOfDay(now));
  const last = samples[samples.length - 1];
  if (!last) return 'No samples. The step sensor gave no value.';
  const time = new Date(last.at).toTimeString().slice(0, 5);
  return `Today: ${today.length} samples. Last sensor value: ${n(last.counter)} at ${time}.`;
}

/** The runs of this week. */
function Runs({ list }: { list: Run[] }) {
  if (list.length === 0) return null;
  const minutes = list.reduce((a, r) => a + r.minutes, 0);
  return (
    <Text style={s.runs}>
      {list.length === 1 ? '1 run' : `${list.length} runs`} this week, {minutes} min in total
    </Text>
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
  chartTitle: { fontSize: 13, color: c.muted, marginTop: 4 },
  note: { fontSize: 13, color: c.muted },
  runs: { fontSize: 15, color: c.ink },
});
