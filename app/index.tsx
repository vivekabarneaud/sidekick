import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardImage } from '../src/CardImage';
import { deleteLog, listExercises, type Exercise, type ExerciseRow } from '../src/db';
import { LogPanel, type Saved } from '../src/LogPanel';
import { DEFAULT_SETTINGS, formatSeconds, loadSettings, type InputSettings } from '../src/measure';
import { c, GRID } from '../src/theme';

const UNDO_MS = 6000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** The fast log page. The app opens on this page. */
export default function FastLog() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [rows, setRows] = useState<ExerciseRow[] | null>(null);
  const [settings, setSettings] = useState<InputSettings>(DEFAULT_SETTINGS);
  const [open, setOpen] = useState<Exercise | null>(null);
  const [toast, setToast] = useState<Saved | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * "reorder" true: the most recent card goes first. We do this only when the
   * page opens. After a log, the cards stay in place, so the user does not
   * lose the card under their finger.
   */
  const load = useCallback(async (reorder: boolean) => {
    const fresh = await listExercises(startOfToday());
    setRows((old) => {
      if (reorder || !old) return fresh;
      const pos = new Map(old.map((r, i) => [r.id, i]));
      return [...fresh].sort((a, b) => (pos.get(a.id) ?? -1) - (pos.get(b.id) ?? -1));
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(true);
      void loadSettings().then(setSettings);
    }, [load]),
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function showToast(t: Saved | null) {
    if (timer.current) clearTimeout(timer.current);
    setToast(t);
    if (t) timer.current = setTimeout(() => setToast(null), UNDO_MS);
  }

  function onSaved(saved: Saved) {
    setOpen(null);
    showToast(saved);
    void load(false);
  }

  async function undo() {
    if (!toast) return;
    const id = toast.logId;
    showToast(null);
    await deleteLog(id);
    void load(false);
  }

  const tile = (width - GRID.pad * 2 - GRID.gutter * (GRID.columns - 1)) / GRID.columns;

  return (
    <View style={[s.page, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Today</Text>
        <Pressable
          onPress={() => router.push('/card/new')}
          style={({ pressed }) => [s.add, pressed && s.pressed]}
          accessibilityLabel="New card"
          hitSlop={8}
        >
          <Text style={s.addText}>+</Text>
        </Pressable>
      </View>

      {rows && rows.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No cards yet</Text>
          <Text style={s.emptyBody}>Make a card for each exercise that you do during the day.</Text>
          <Pressable
            onPress={() => router.push('/card/new')}
            style={({ pressed }) => [s.emptyBtn, pressed && s.pressed]}
          >
            <Text style={s.emptyBtnText}>Make my first card</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows ?? []}
          key={GRID.columns}
          numColumns={GRID.columns}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{
            padding: GRID.pad,
            gap: GRID.gutter,
            paddingBottom: insets.bottom + 96,
          }}
          columnWrapperStyle={{ gap: GRID.gutter }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setOpen(item)}
              style={({ pressed }) => [s.card, { width: tile }, pressed && s.pressed]}
            >
              <CardImage exercise={item} size={tile * 0.42} />
              <Text style={s.cardName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={s.cardToday} numberOfLines={1}>
                {todayLine(item)}
              </Text>
            </Pressable>
          )}
        />
      )}

      {toast ? (
        <View style={[s.toast, { bottom: insets.bottom + 16 }]}>
          <Text style={s.toastText} numberOfLines={2}>
            Saved. {toast.summary}
          </Text>
          <Pressable onPress={undo} hitSlop={10}>
            <Text style={s.toastUndo}>Undo</Text>
          </Pressable>
        </View>
      ) : null}

      <LogPanel
        exercise={open}
        settings={settings}
        onClose={() => setOpen(null)}
        onSaved={onSaved}
      />
    </View>
  );
}

function todayLine(r: ExerciseRow) {
  if (r.measure === 'time') return r.seconds_since ? `Today: ${formatSeconds(r.seconds_since)}` : ' ';
  return r.reps_since ? `Today: ${r.reps_since} reps` : ' ';
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.ground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID.pad + 4,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: { fontSize: 30, fontWeight: '800', color: c.ink },
  add: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: c.accentInk, fontSize: 28, fontWeight: '600', marginTop: -2 },
  pressed: { opacity: 0.6 },
  card: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  cardName: { fontSize: 17, fontWeight: '700', color: c.ink, minHeight: 44 },
  cardToday: { fontSize: 14, color: c.muted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: c.ink },
  emptyBody: { fontSize: 16, lineHeight: 24, color: c.muted, textAlign: 'center' },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: c.accent,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  emptyBtnText: { color: c.accentInk, fontSize: 17, fontWeight: '700' },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: c.ink,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  toastText: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  toastUndo: { color: '#9DB8FF', fontSize: 16, fontWeight: '700' },
});
