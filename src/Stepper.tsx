import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { c } from './theme';

type Props = {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  unit?: string;
};

/**
 * A number with large "−" and "+" buttons. The user can also push the number
 * and type a value.
 */
export function Stepper({ label, value, onChange, step = 1, min = 1, unit }: Props) {
  const [text, setText] = useState(String(value));

  // Keep the text in sync when a button changes the value.
  useEffect(() => setText(String(value)), [value]);

  // Send each valid value at once. Then "Save" works also while the keyboard
  // is open.
  function type(t: string) {
    setText(t);
    const n = parseInt(t, 10);
    if (Number.isFinite(n) && n >= min) onChange(n);
  }

  // When the user leaves the field with an incorrect value, show the last
  // valid value again.
  function commit(t: string) {
    const n = parseInt(t, 10);
    if (!(Number.isFinite(n) && n >= min)) setText(String(value));
  }

  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <View style={s.controls}>
        <Pressable
          accessibilityLabel={`Less ${label}`}
          onPress={() => onChange(Math.max(min, value - step))}
          style={({ pressed }) => [s.btn, pressed && s.pressed]}
          hitSlop={6}
        >
          <Text style={s.btnText}>−</Text>
        </Pressable>
        <View style={s.valueBox}>
          <TextInput
            value={text}
            onChangeText={type}
            onEndEditing={(e) => commit(e.nativeEvent.text)}
            keyboardType="number-pad"
            selectTextOnFocus
            style={s.value}
            accessibilityLabel={label}
          />
          {unit ? <Text style={s.unit}>{unit}</Text> : null}
        </View>
        <Pressable
          accessibilityLabel={`More ${label}`}
          onPress={() => onChange(value + step)}
          style={({ pressed }) => [s.btn, pressed && s.pressed]}
          hitSlop={6}
        >
          <Text style={s.btnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { gap: 8 },
  label: { fontSize: 15, color: c.muted, fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  btnText: { fontSize: 32, color: c.ink, fontWeight: '500', marginTop: -2 },
  valueBox: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  value: { fontSize: 40, fontWeight: '700', color: c.ink, textAlign: 'center', minWidth: 60 },
  unit: { fontSize: 18, color: c.muted, marginLeft: 4 },
});
