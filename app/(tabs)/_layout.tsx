import { StyleSheet, View, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { c } from '../../src/theme';

const MUTED = '#5F6573';
const PILL = '#DCE5FB';

/** The icon of a tab. The open tab has a light blue pill behind its icon. */
function TabIcon({ focused, color, name }: { focused: boolean; color: ColorValue; name: 'log' | 'totals' }) {
  return (
    <View style={[s.pill, focused && { backgroundColor: PILL }]}>
      <Svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {name === 'log' ? (
          <>
            <Rect x={3} y={3} width={7} height={7} rx={2} />
            <Rect x={14} y={3} width={7} height={7} rx={2} />
            <Rect x={3} y={14} width={7} height={7} rx={2} />
            <Rect x={14} y={14} width={7} height={7} rx={2} />
          </>
        ) : (
          <Path d="M4 20V11M10 20V5M16 20v-7M21 20H3" />
        )}
      </Svg>
    </View>
  );
}

export default function TabsLayout() {
  // The bar is 72 px high, plus the space of the Android navigation bar.
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: MUTED,
        tabBarLabelStyle: s.label,
        tabBarStyle: [s.bar, { height: 72 + insets.bottom, paddingBottom: insets.bottom + 8 }],
        sceneStyle: { backgroundColor: c.ground },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Log',
          tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} name="log" />,
        }}
      />
      <Tabs.Screen
        name="totals"
        options={{
          title: 'Totals',
          tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} name="totals" />,
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: c.surface,
    borderTopColor: c.hairline,
    paddingTop: 8,
  },
  label: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  pill: {
    width: 64,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
