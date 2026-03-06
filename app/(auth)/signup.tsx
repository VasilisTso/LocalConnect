import { supabase } from "@/lib/supabase";
import { AuthError } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { useAppStore } from "@/store/useAppStore";
import Colors from "@/constants/Colors";

/**
 * @description Authentication Signup Screen
 * Human-Centric Goal: Clear, guided onboarding.
 * Architectural Note: Upon successful auth signup, this component immediately
 * creates a default row in the `public.profiles` table so the Adaptivity Engine
 * has a baseline (karma = 0, transport = walking) to work with immediately.
 */
export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Add local state to track visibility
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Zustand state for conditional non-Tailwind styling (like icons)
  const isSeniorMode = useAppStore((state) => state.isSeniorMode);
  const showAlert = useAppStore((state) => state.showAlert);
  // Using secondary color for icons to match title and button of signup page
  const iconColor = isSeniorMode ? Colors.dark.secondary : Colors.light.secondary;
  const placeholderColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  async function handleSignup() {
    if (!email || !password) {
      showAlert("Missing Fields", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      // user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(), // to remove invisible space at the end of string, "sanitize"
        password,
      });

      if (authError) throw authError;

      // Initialize their Adaptivity Profile immediately
      if (authData.user) {
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: authData.user.id,
            transport_mode: "walking", // Default mode
            tags: [], // Empty default tags
            karma_points: 0,
          },
        ]);

        if (profileError) {
          console.error("Profile initialization failed:", profileError);
          // We don't throw here to avoid completely blocking the user,
          // but we log it for debugging.
        }
      }

      showAlert("Success!", "Your account has been created.");
      // Router will automatically redirect to /(tabs) via RootLayout listener
    } catch (error) {
      const authError = error as AuthError;
      showAlert(
        "Signup Failed",
        authError.message || "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 80,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER ANIMATION */}
          <Animated.View 
            entering={FadeInDown.duration(600).springify()} 
            className="mb-10 items-center"
          >
            <Text className="text-4xl font-sans font-bold text-secondary mb-2 dark:text-4xl">
              Create Account
            </Text>
            <Text className="text-text-muted font-sans text-base text-center dark:text-lg">
              Join your neighborhood today.
            </Text>
          </Animated.View>

          {/* EMAIL INPUT ANIMATION */}
          <Animated.View 
            entering={FadeInDown.delay(100).duration(600).springify()} 
            className="mb-4"
          >
            <Text className="text-text font-sans text-sm mb-2 font-semibold dark:text-lg">
              Email
            </Text>
            <View className="flex-row items-center bg-surface border border-surface-highlight dark:border-senior dark:border-border rounded-xl dark:rounded-senior px-4 py-3 dark:py-4">
              <Mail color={iconColor} size={isSeniorMode ? 26 : 20} className="mr-3" />
              <TextInput
                className="flex-1 ml-2 text-text font-sans text-base dark:text-lg"
                placeholder="Enter your email"
                placeholderTextColor={placeholderColor}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              </View>
          </Animated.View>

          {/* PASSWORD INPUT ANIMATION */}
          <Animated.View 
            entering={FadeInDown.delay(200).duration(600).springify()} 
            className="mb-8"
          >
            <Text className="text-text font-sans text-sm mb-2 font-semibold dark:text-lg">
              Password
            </Text>
            <View className="flex-row items-center bg-surface border border-surface-highlight dark:border-senior dark:border-border rounded-xl dark:rounded-senior px-4 py-3 dark:py-4">
              <Lock color={iconColor} size={isSeniorMode ? 26 : 20} className="mr-3" />
              <TextInput
                className="flex-1 ml-2 text-text font-sans text-base dark:text-lg"
                placeholder="Choose a strong password"
                placeholderTextColor={placeholderColor}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="p-1 ml-2"
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                {showPassword ? (
                  <EyeOff color={iconColor} size={isSeniorMode ? 26 : 20} />
                ) : (
                  <Eye color={iconColor} size={isSeniorMode ? 26 : 20} />
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* SIGNUP BUTTON ANIMATION */}
          <Animated.View entering={FadeInDown.delay(300).duration(600).springify()}>
            <TouchableOpacity
              className="bg-secondary py-4 dark:py-5 rounded-xl dark:rounded-senior items-center flex-row justify-center mb-4"
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={isSeniorMode ? "#FFFFFF" : "#1A1826"} />
              ) : (
                <Text className="text-on-secondary font-sans text-lg dark:text-xl font-bold">
                  Sign Up
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* LOGIN NAVIGATION ANIMATION */}
          <Animated.View 
            entering={FadeInUp.delay(500).duration(600).springify()} 
            className="flex-row justify-center mt-auto"
          >
            <Text className="text-text-muted font-sans text-base dark:text-lg">
              Already have an account?{" "}
            </Text>
            <TouchableOpacity 
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-primary font-sans text-base dark:text-lg font-bold dark:text-text dark:underline">
                Log In
              </Text>
            </TouchableOpacity>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
