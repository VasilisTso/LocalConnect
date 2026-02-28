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
  AUTH MANAGER (Invisible Component)
  Handles all routing and session logic. By isolating this, any re-renders 
  caused by session changes do not tear down the Expo Router NavigationContainer.
*/
function AuthManager() {
  // Use selectors for auth! This prevents the router from crashing
  // because it no longer re-renders when UI preferences (like isSeniorMode) change.
  const session = useAppStore((state) => state.session);
  const setSession = useAppStore((state) => state.setSession);

  const segments = useSegments();
  const router = useRouter();
  // This hook lets us know when Expo Router is ready
  const rootNavigationState = useRootNavigationState();

  // Supabase Auth Listener (Session Management)
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  // Route Protection Logic
  useEffect(() => {
    // Do nothing until the navigation tree is fully mounted
    if (!rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === "(auth)";

    // Wait for navigation to be ready
    if (session === undefined) return;

    if (!session && !inAuthGroup) {
      // If user is not logged in, force them to the login screen
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // If user is logged in but trying to view auth screens, send
      router.replace("/(tabs)");
    }
  }, [session, segments, rootNavigationState?.key]);

  return null; // This component renders absolutely nothing!
}

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
      className={
        isSeniorMode
          ? "flex-1 bg-background theme-senior"
          : "flex-1 bg-background"
      }
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

        {/* Render AuthManager INSIDE the tree so it has access to Navigation Context */}
        <AuthManager />
      </ThemeWrapper>
    </SafeAreaProvider>
  );
}
