import { StyleSheet, Text, View } from 'react-native';
import type { Exercise } from './db';

/**
 * The image of a card. The glyphs and the photos are not available yet.
 * Thus, all cards show the first letter of the name on the card color.
 */
export function CardImage({ exercise, size }: { exercise: Exercise; size: number }) {
  const letter = exercise.name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={[
        s.box,
        { width: size, height: size, borderRadius: size * 0.22, backgroundColor: exercise.color },
      ]}
    >
      <Text style={[s.letter, { fontSize: size * 0.45 }]}>{letter}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#FFFFFF', fontWeight: '800' },
});
