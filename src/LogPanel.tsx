import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addLog, lastLog, type Exercise } from './db';
import { formatSeconds, type InputSettings } from './measure';
import { Stepper } from './Stepper';
import { c } from './theme';

export type Saved = { logId: number; summary: string };

type Props = {
  exercise: Exercise | null;
  settings: InputSettings;
  onClose: () => void;
  onSaved: (s: Saved) => void;
};

/** The values when a card has no log yet. */
const START = { reps: 5, seconds: 10, perRep: 3 };

/**
 * The panel at the bottom of the screen. It starts with the last values of
 * the card, so usually the user only pushes "Save".
 */
export function LogPanel({ exercise, settings, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const [sets, setSets] = useState(1);
  const [reps, setReps] = useState(START.reps);
  const [hold, setHold] = useState(START.seconds);
  const [busy, setBusy] = useState(false);

  const measure = exercise?.measure;
  const perRep = measure === 'reps_time' && settings.holdInput === 'per_rep';

  useEffect(() => {
    if (!exercise) return;
    let live = true;
    setBusy(false);
    void lastLog(exercise.id).then((last) => {
      if (!live) return;
      const r = last?.reps ?? START.reps;
      setSets(settings.sets ? (last?.sets ?? 1) : 1);
      setReps(r);
      if (exercise.measure === 'reps_time' && settings.holdInput === 'per_rep') {
        setHold(last?.seconds ? Math.max(1, Math.round(last.seconds / Math.max(1, r))) : START.perRep);
      } else {
        setHold(last?.seconds ?? START.seconds);
      }
    });
    return () => {
      live = false;
    };
  }, [exercise, settings]);

  async function save() {
    if (!exercise || busy) return;
    setBusy(true);
    const useReps = measure !== 'time';
    const useTime = measure !== 'reps';
    // The database always keeps the total seconds held in each set.
    const seconds = useTime ? (perRep ? hold * reps : hold) : null;
    try {
      const logId = await addLog({
        exercise_id: exercise.id,
        sets,
        reps: useReps ? reps : null,
        seconds,
      });
      onSaved({ logId, summary: summarize(exercise.name, sets, useReps ? reps : null, seconds) });
    } catch (e) {
      console.error('Could not save the log', e);
      setBusy(false);
    }
  }

  return (
    <Modal visible={!!exercise} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior="padding">
        <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={s.title} numberOfLines={2}>
            {exercise?.name}
          </Text>

          {settings.sets ? <Stepper label="Sets" value={sets} onChange={setSets} /> : null}
          {measure !== 'time' ? <Stepper label="Reps" value={reps} onChange={setReps} /> : null}
          {measure === 'time' ? (
            <Stepper label="Time held" value={hold} onChange={setHold} step={5} unit="s" />
          ) : null}
          {measure === 'reps_time' ? (
            <Stepper
              label={perRep ? 'Time held for each rep' : 'Total time held'}
              value={hold}
              onChange={setHold}
              step={perRep ? 1 : 5}
              unit="s"
            />
          ) : null}

          <Pressable
            onPress={save}
            disabled={busy}
            style={({ pressed }) => [s.save, (pressed || busy) && s.pressed]}
          >
            <Text style={s.saveText}>Save</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function summarize(name: string, sets: number, reps: number | null, seconds: number | null) {
  const parts: string[] = [];
  if (reps !== null) parts.push(`${reps} reps`);
  if (seconds !== null) parts.push(reps !== null ? `held ${formatSeconds(seconds)}` : formatSeconds(seconds));
  const what = parts.join(', ');
  return `${name}: ${sets > 1 ? `${sets} × ` : ''}${what}`;
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: c.scrim },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 22,
  },
  title: { fontSize: 22, fontWeight: '700', color: c.ink },
  save: {
    backgroundColor: c.accent,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  pressed: { opacity: 0.7 },
  saveText: { color: c.accentInk, fontSize: 18, fontWeight: '700' },
});
