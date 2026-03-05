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
import { ThemeProvider, DefaultTheme, DarkTheme, Theme } from "@react-navigation/native";
import { View } from 'react-native';

// Our custom state and backend
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import Colors from "@/constants/Colors";

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

  // custom themes for the absolute root canvas to prevent the white flash
  const customNormalTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: Colors.light.primary,
      background: Colors.light.background,
      card: Colors.light.surface,
      text: Colors.light.text,
      border: Colors.light.border,
      notification: Colors.light.tint,
    },
  };

  const customSeniorTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.dark.primary,
      background: Colors.dark.background,
      card: Colors.dark.surface,
      text: Colors.dark.text,
      border: Colors.dark.border,
      notification: Colors.dark.tint,
    },
  };

  return (
    <SafeAreaProvider>
      {/* ADAPTIVE STATUS BAR:
        Normal Mode (#1A1826) needs white/light text.
        Senior Mode (#FFFFFF) needs black/dark text.
      */}
      <ThemeProvider value={isSeniorMode ? customSeniorTheme : customNormalTheme}>
        
        <StatusBar 
          style={isSeniorMode ? "dark" : "light"} 
          backgroundColor="transparent" 
          translucent 
        />

        <View 
          style={{ 
            flex: 1, 
            backgroundColor: isSeniorMode ? Colors.dark.background : Colors.light.background 
          }}
        >
          {/* GLOBAL TABLET WRAPPER: Constrains app width on iPads, remains 100% width on phones */}
          <View className="flex-1 w-full max-w-2xl mx-auto overflow-hidden shadow-2xl">

            <Stack 
              screenOptions={{ 
                headerShown: false, 
                // Enforce our design system's exact background colors for React Navigation
                contentStyle: { 
                  backgroundColor: isSeniorMode ? Colors.dark.background : Colors.light.background 
                },
                // ACCESSIBILITY FEATURE: "Reduce Motion"
                // Slide animations are modern, but fade animations prevent disorientation for seniors
                animation: isSeniorMode ? "fade" : "slide_from_right"
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />

              <Stack.Screen 
                name="modal" 
                options={{ 
                  presentation: "modal",
                  animation: isSeniorMode ? "fade" : "slide_from_bottom"
                }} 
              />
              <Stack.Screen 
                name="chat" 
                options={{ 
                  presentation: "modal",
                  animation: isSeniorMode ? "fade" : "slide_from_bottom"
                }} 
              />
              <Stack.Screen 
                name="review" 
                options={{ 
                  presentation: "modal",
                  animation: isSeniorMode ? "fade" : "slide_from_bottom"
                }} 
              />
              <Stack.Screen name="task-details" options={{ headerShown: false }} />
            </Stack>
          </View>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}