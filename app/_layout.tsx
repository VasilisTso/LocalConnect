import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

// Our custom state and backend
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";

import "../globals.css";

export { ErrorBoundary } from "expo-router";

// Prevent splash screen from hiding until fonts load
SplashScreen.preventAutoHideAsync();

/**
 * ROUTING & AUTH HOOK (Refactored from AuthManager component)
 * By using a hook instead of an invisible component, we ensure this runs
 * safely inside the RootLayout without adding empty nodes to the React tree.
 */
function useAuthManager() {
  const session = useAppStore((state) => state.session);
  const setSession = useAppStore((state) => state.setSession);

  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (session === undefined) return;

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, segments, rootNavigationState?.key]);
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
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
  useAuthManager();
  
  // THE ADAPTIVITY ENGINE (UI LEVEL)
  // We sync Zustand state with NativeWind's built-in theme engine
  const isSeniorMode = useAppStore((state) => state.isSeniorMode);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    // If Senior Mode is active, we trigger NativeWinds dark mode, 
    // which automatically cascades our high-contrast CSS variables
    setColorScheme(isSeniorMode ? "dark" : "light");
  }, [isSeniorMode, setColorScheme]);

  return (
    <SafeAreaProvider>
      {/* FORCE STATUS BAR TO DARK TEXT:
        Since both your standard background (#FAFAFA) and senior background (#FFFFFF)
        are light colors, the status bar text/icons must ALWAYS be forced to dark (black).
      */}
      <StatusBar style="dark" backgroundColor="transparent" />
      
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'var(--color-background)' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
