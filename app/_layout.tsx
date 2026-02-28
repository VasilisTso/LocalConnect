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
import { vars } from "nativewind";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Our custom state and backend
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";

import "../globals.css";

export { ErrorBoundary } from "expo-router";

// Prevent splash screen from hiding until fonts load
SplashScreen.preventAutoHideAsync();

/**
 * 1. ROUTING & AUTH HOOK (Refactored from AuthManager component)
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

/**
 * 2. THE THEME VARIABLES
 * We map out the Senior Mode CSS variables here.
 */
const seniorTheme = vars({
  "--color-primary": "#3B2F56",
  "--color-secondary": "#FFB300",
  "--color-background": "#FFFFFF",
  "--color-surface": "#F8F9FA",
  "--color-surface-highlight": "#E9ECEF",
  "--color-text": "#000000",
  "--color-text-muted": "#495057",
  "--color-error": "#D32F2F",
});

/**
 * @description THE ADAPTIVITY ENGINE (UI LEVEL)
 * We isolate the theme wrapper into its own component.
 * By using a Zustand selector (state => state.isSeniorMode), this specific View
 * is the ONLY thing at the root level that re-renders when the toggle is clicked.
 */

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const isSeniorMode = useAppStore((state) => state.isSeniorMode);

  return (
    <View
      // The className remains STATIC. The component tree never unmounts!
      className="flex-1 bg-background"
      // We inject the variables dynamically via the style prop
      style={isSeniorMode ? seniorTheme : undefined}
    >
      <StatusBar style="dark" />
      {children}
    </View>
  );
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
  // Call the custom hook directly inside the component
  useAuthManager();

  return (
    /* ALWAYS use SafeAreaProvider at the root */
    <SafeAreaProvider>
      <ThemeWrapper>
        {/* THE ADAPTIVITY ENGINE (UI LEVEL):
          This single View wraps the entire application. By toggling the 'theme-senior'
          class based on Zustand state, we instantly change the CSS variables (--color-primary, etc.)
          for every component inside the app, creating an instant High-Contrast mode.
        */}
        <Stack screenOptions={{ headerShown: false }}>
          {/* Explicitly define our route groups so Expo knows they exist */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        </Stack>
      </ThemeWrapper>
    </SafeAreaProvider>
  );
}
