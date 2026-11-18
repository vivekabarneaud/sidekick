import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { countExercises, createExercise } from '../../src/db';
import { suggest, type LibraryEntry } from '../../src/library';
import { MEASURES, type Measure } from '../../src/measure';
import { c, CARD_COLORS } from '../../src/theme';

/** The card page: the user makes a new card here. */
export default function NewCard() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [measure, setMeasure] = useState<Measure>('reps');
  const [picked, setPicked] = useState<LibraryEntry | null>(null);
  const [busy, setBusy] = useState(false);

  // Show the suggestions only while the user types a name of their own.
  const suggestions = picked && picked.name === name ? [] : suggest(name);

  function pick(e: LibraryEntry) {
    setPicked(e);
    setName(e.name);
    setMeasure(e.measure);
  }

  async function save() {
    const clean = name.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      const n = await countExercises();
      // A card from the library keeps its library key only if the user did
      // not change the name.
      const fromLibrary = picked && picked.name === clean ? picked : null;
      await createExercise({
        name: clean,
        measure,
        library_key: fromLibrary?.key ?? null,
        image_kind: fromLibrary ? 'glyph' : 'none',
        color: CARD_COLORS[n % CARD_COLORS.length],
      });
      router.back();
    } catch (e) {
      console.error('Could not save the card', e);
      setBusy(false);
    }
  }

  return (
    <View style={[s.page, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={s.cancel}>Cancel</Text>
        </Pressable>
        <Text style={s.title}>New card</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="For example: wall push-up"
          placeholderTextColor={c.faint}
          style={s.input}
          autoFocus
          autoCapitalize="sentences"
          returnKeyType="done"
        />

        {suggestions.length > 0 ? (
          <View style={s.suggestions}>
            {suggestions.map((e) => (
              <Pressable
                key={e.key}
                onPress={() => pick(e)}
                style={({ pressed }) => [s.suggestion, pressed && s.pressed]}
              >
                <Text style={s.suggestionName}>{e.name}</Text>
                <Text style={s.suggestionMeasure}>
                  {MEASURES.find((m) => m.key === e.measure)?.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={[s.label, { marginTop: 20 }]}>Measure</Text>
        <View style={s.measures}>
          {MEASURES.map((m) => {
            const on = m.key === measure;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMeasure(m.key)}
                style={[s.measure, on && s.measureOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.measureLabel, on && s.measureLabelOn]}>{m.label}</Text>
                <Text style={s.measureHint}>{m.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={save}
          disabled={!name.trim() || busy}
          style={({ pressed }) => [
            s.save,
            (!name.trim() || busy) && s.disabled,
            pressed && s.pressed,
          ]}
        >
          <Text style={s.saveText}>Save the card</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.ground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  cancel: { fontSize: 16, color: c.accent, width: 56 },
  title: { fontSize: 18, fontWeight: '700', color: c.ink },
  body: { padding: 18, gap: 10 },
  label: { fontSize: 15, fontWeight: '600', color: c.muted },
  input: {
    backgroundColor: c.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: c.ink,
  },
  suggestions: { backgroundColor: c.surface, borderRadius: 14, overflow: 'hidden' },
  suggestion: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.hairline,
  },
  suggestionName: { fontSize: 16, color: c.ink, fontWeight: '600' },
  suggestionMeasure: { fontSize: 13, color: c.muted, marginTop: 2 },
  measures: { gap: 10 },
  measure: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  measureOn: { borderColor: c.accent },
  measureLabel: { fontSize: 16, fontWeight: '700', color: c.ink },
  measureLabelOn: { color: c.accent },
  measureHint: { fontSize: 14, color: c.muted, marginTop: 2 },
  save: {
    marginTop: 24,
    backgroundColor: c.accent,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  saveText: { color: c.accentInk, fontSize: 18, fontWeight: '700' },
});
