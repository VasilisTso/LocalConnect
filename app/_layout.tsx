// app/_layout.tsx
import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import FontAwesome from '@expo/vector-icons/FontAwesome';

// Our custom state and backend
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';

import '../globals.css';

export { ErrorBoundary } from 'expo-router';

// Prevent splash screen from hiding until fonts load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const { isSeniorMode, setSession, session } = useAppStore();
  const segments = useSegments();
  const router = useRouter();

  // This hook lets us know when Expo Router is ready
  const rootNavigationState = useRootNavigationState();

  // 1. Supabase Auth Listener (Session Management)
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Route Protection Logic
  useEffect(() => {
    // FIX: Do nothing until the navigation tree is fully mounted
    if (!rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    // Wait for navigation to be ready
    if (session === undefined) return; 

    if (!session && !inAuthGroup) {
      // If user is not logged in, force them to the login screen
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // If user is logged in but trying to view auth screens, send to main feed
      router.replace('/(tabs)');
    }
  }, [session, segments]);

  return (
    /* ALWAYS use SafeAreaProvider at the root per strict project guidelines */
    <SafeAreaProvider>
      {/* THE ADAPTIVITY ENGINE (UI LEVEL):
        This single View wraps the entire application. By toggling the 'theme-senior'
        class based on Zustand state, we instantly change the CSS variables (--color-primary, etc.)
        for every component inside the app, creating an instant High-Contrast mode.
      */}
      <View className={`flex-1 bg-background ${isSeniorMode ? 'theme-senior' : ''}`}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </SafeAreaProvider>
  );
}