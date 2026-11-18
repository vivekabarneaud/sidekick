import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardImage } from '../../src/CardImage';
import { longDate, startOfDay, startOfMonth } from '../../src/dates';
import { allLogs, listExercises, type ExerciseRow, type Log } from '../../src/db';
import { formatSeconds, type Measure } from '../../src/measure';
import {
  activeDays,
  bests,
  between,
  primary,
  sameDaysWeeksAgo,
  sum,
  weekly,
  weekStarts,
  type Totals,
} from '../../src/stats';
import { c } from '../../src/theme';
import { WeeklyColumns } from '../../src/WeeklyColumns';

const WEEKS = 8;

type Data = { exercises: ExerciseRow[]; logs: Log[]; now: number };

/** "1,284 reps". */
function reps(n: number) {
  return `${n.toLocaleString('en-GB')} reps`;
}

/** The main number of an exercise, with its unit. */
function amount(measure: Measure, n: number) {
  return measure === 'time' ? formatSeconds(n) : reps(n);
}

/** A short format for the chart: "45 s", "3 min", "120". */
function chartFormat(measure: Measure) {
  return (n: number) =>
    measure === 'time' ? (n < 120 ? `${n} s` : `${Math.round(n / 60)} min`) : n.toLocaleString('en-GB');
}

export default function TotalsPage() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Data | null>(null);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      void Promise.all([listExercises(startOfDay(now)), allLogs()]).then(([exercises, logs]) =>
        setData({ exercises, logs, now }),
      );
    }, []),
  );

  return (
    <View style={[s.page, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Totals</Text>
      </View>

      {data ? (
        data.logs.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Nothing here yet</Text>
            <Text style={s.emptyBody}>
              Log an exercise on the first page. Your totals and your progress show here.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={[s.body, { paddingBottom: 32 }]}>
            <Overview data={data} />
            {data.exercises
              .filter((e) => data.logs.some((l) => l.exercise_id === e.id))
              .map((e) => (
                <ExerciseTotals
                  key={e.id}
                  exercise={e}
                  logs={data.logs.filter((l) => l.exercise_id === e.id)}
                  now={data.now}
                />
              ))}
          </ScrollView>
        )
      ) : null}
    </View>
  );
}

function Overview({ data }: { data: Data }) {
  const { logs, now } = data;
  const today = sum(between(logs, startOfDay(now)));
  const cmp = sameDaysWeeksAgo(logs, now);
  const days = activeDays(logs, startOfMonth(now));
  const hasTime = logs.some((l) => l.seconds !== null);

  return (
    <View style={s.section}>
      <View style={s.tiles}>
        <Tile label="Reps today" value={today.reps.toLocaleString('en-GB')} />
        <Tile label="Reps this week" value={cmp.now.reps.toLocaleString('en-GB')} />
      </View>
      <View style={s.tiles}>
        {hasTime ? <Tile label="Time held this week" value={formatSeconds(cmp.now.seconds)} /> : null}
        <Tile label="Active days this month" value={String(days)} />
      </View>
      <Compare now={cmp.now} before={cmp.before} />
    </View>
  );
}

/**
 * The comparison with 4 weeks ago. More: the app shows it in green. Less or
 * equal: the app shows only the two numbers, in neutral colors.
 */
function Compare({ now, before }: { now: Totals; before: Totals }) {
  // Use the reps. If there are no reps (only "time held" cards), use the time.
  const useReps = now.reps > 0 || before.reps > 0;
  const a = useReps ? now.reps : now.seconds;
  const b = useReps ? before.reps : before.seconds;
  if (b === 0) return null;
  const show = useReps ? reps : formatSeconds;
  return (
    <View style={s.compare}>
      {a > b ? (
        <Text style={s.compareGood}>
          ▲ {useReps ? reps(a - b) : formatSeconds(a - b)} more than at the same time 4 weeks ago
        </Text>
      ) : (
        <Text style={s.compareText}>
          This week until now: {show(a)}. The same days 4 weeks ago: {show(b)}.
        </Text>
      )}
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

function ExerciseTotals({ exercise, logs, now }: { exercise: ExerciseRow; logs: Log[]; now: number }) {
  const m = exercise.measure;
  const starts = weekStarts(WEEKS, now);
  const values = weekly(logs, starts).map((t) => primary(m, t));
  const today = primary(m, sum(between(logs, startOfDay(now))));
  const week = values[values.length - 1];
  const all = primary(m, sum(logs));
  const best = bests(logs);

  const bestLines: string[] = [];
  if (m !== 'time' && best.reps) {
    bestLines.push(`Most reps in one set: ${best.reps.value} (${longDate(best.reps.at, now)})`);
  }
  if (m === 'time' && best.seconds) {
    bestLines.push(`Longest hold: ${formatSeconds(best.seconds.value)} (${longDate(best.seconds.at, now)})`);
  }
  if (m === 'reps_time' && best.holdPerRep) {
    bestLines.push(
      `Longest hold for each rep: ${formatSeconds(best.holdPerRep.value)} (${longDate(best.holdPerRep.at, now)})`,
    );
  }

  const unit = m === 'time' ? 'time held' : 'reps';

  return (
    <View style={s.section}>
      <View style={s.exHeader}>
        <CardImage exercise={exercise} size={36} />
        <Text style={s.exName} numberOfLines={2}>
          {exercise.name}
        </Text>
      </View>

      <View style={s.row3}>
        <Small label="Today" value={amount(m, today)} />
        <Small label="This week" value={amount(m, week)} />
        <Small label="All time" value={amount(m, all)} />
      </View>

      {bestLines.map((b) => (
        <Text key={b} style={s.best}>
          ★ {b}
        </Text>
      ))}

      <Text style={s.chartTitle}>
        {unit === 'reps' ? 'Reps' : 'Time held'} each week, last {WEEKS} weeks
      </Text>
      <WeeklyColumns
        values={values}
        starts={starts}
        format={chartFormat(m)}
        label={`${exercise.name}: ${unit} each week. ${values
          .map((v, i) => `Week of ${longDate(starts[i], now)}: ${amount(m, v)}`)
          .join('. ')}`}
      />
    </View>
  );
}

function Small({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.small}>
      <Text style={s.smallLabel}>{label}</Text>
      <Text style={s.smallValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.ground },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 4, minHeight: 64, justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: c.ink },
  body: { padding: 14, gap: 14 },
  section: { backgroundColor: c.surface, borderRadius: 20, padding: 16, gap: 12 },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, gap: 4 },
  tileLabel: { fontSize: 13, color: c.muted },
  tileValue: { fontSize: 28, fontWeight: '700', color: c.ink },
  compare: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline, paddingTop: 12 },
  compareGood: { fontSize: 15, color: '#2F7D4F', fontWeight: '600' },
  compareText: { fontSize: 15, color: c.muted, lineHeight: 22 },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exName: { flex: 1, fontSize: 18, fontWeight: '700', color: c.ink },
  row3: { flexDirection: 'row', gap: 10 },
  small: { flex: 1, gap: 2 },
  smallLabel: { fontSize: 12, color: c.muted },
  smallValue: { fontSize: 17, fontWeight: '700', color: c.ink },
  best: { fontSize: 14, color: c.ink },
  chartTitle: { fontSize: 13, color: c.muted, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: c.ink },
  emptyBody: { fontSize: 16, lineHeight: 24, color: c.muted, textAlign: 'center' },
});
