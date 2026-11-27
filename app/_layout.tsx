import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { init } from '../src/db';
// This import also defines the background task for the steps. Keep it here.
import { keepCounting } from '../src/steps';
import { c } from '../src/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    init()
      .catch((e) => {
        console.error('Could not open the database', e);
        setBroken(true);
      })
      .finally(() => {
        setReady(true);
        void SplashScreen.hideAsync();
      });
  }, []);

  // Save the step count each time that the app opens or comes back to the front.
  useEffect(() => {
    const count = () => keepCounting().catch((e) => console.warn('Could not save the steps', e));
    void count();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void count();
    });
    return () => sub.remove();
  }, []);

  if (!ready) return null;

  // All pages read from the database. Thus, we show the problem one time,
  // here, and not on each page.
  if (broken) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={s.broken}>
          <Text style={s.brokenTitle}>Sidekick cannot open your data</Text>
          <Text style={s.brokenBody}>
            Your data is not lost. Close Sidekick and open it again.
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.ground },
        }}
      />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  broken: {
    flex: 1,
    backgroundColor: c.ground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  brokenTitle: { fontSize: 22, fontWeight: '700', color: c.ink, textAlign: 'center' },
  brokenBody: { fontSize: 16, lineHeight: 24, color: c.muted, textAlign: 'center' },
});
