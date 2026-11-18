import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Exercise } from './db';
import { GLYPHS } from './glyphs';

/**
 * The image of a card. A card from the library shows its drawing. The other
 * cards show the first letter of the name. Photos are not available yet.
 */
export function CardImage({ exercise, size }: { exercise: Exercise; size: number }) {
  const glyph =
    exercise.image_kind === 'glyph' && exercise.library_key ? GLYPHS[exercise.library_key] : undefined;
  const letter = exercise.name.trim().charAt(0).toUpperCase() || '?';
  const box = {
    width: size,
    height: size,
    borderRadius: size * 0.27,
    backgroundColor: exercise.color,
  };

  if (glyph) {
    const inner = size * 0.9;
    return (
      <View style={[s.box, box]} accessibilityElementsHidden importantForAccessibility="no">
        <Svg width={inner} height={inner} viewBox="0 0 48 48" fill="none">
          <Path
            d={glyph.dim}
            stroke="#FFFFFF"
            strokeOpacity={0.55}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={glyph.body}
            stroke="#FFFFFF"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    );
  }

  return (
    <View style={[s.box, box]}>
      <Text style={[s.letter, { fontSize: size * 0.45 }]}>{letter}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#FFFFFF', fontWeight: '800' },
});
