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
 * @description Authentication Login Screen
 * Human-Centric Goal: Provides a high-contrast, accessible entry point.
 * Form elements are large and clearly labeled, and the UI relies entirely on
 * semantic NativeWind variables so it instantly adapts if Senior Mode is triggered.
 */
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // local state to track visibility
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // We need the Zustand state to pass raw hex colors to non-Tailwind elements 
  // like the Lucide Icons and TextInput placeholders.
  const isSeniorMode = useAppStore((state) => state.isSeniorMode);
  const showAlert = useAppStore((state) => state.showAlert);
  const iconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
  const placeholderColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  async function handleLogin() {
    if (!email || !password) {
      showAlert("Missing Fields", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(), // to remove invisible space at the end of string, "sanitize"
        password,
      });

      if (error) throw error;

      // no need to manually route to /(tabs) here because our RootLayout listener will automatically detect the session and redirect!
    } catch (error) {
      const authError = error as AuthError;
      showAlert(
        "Login Failed",
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
          {/* HEADER */}
          <Animated.View 
            entering={FadeInDown.duration(600).springify()} 
            className="mb-12 items-center"
          >
            <Text className="text-4xl font-sans font-bold text-primary mb-2">
              LocalConnect
            </Text>
            <Text className="text-text-muted font-sans text-base text-center dark:text-lg">
              Your neighborhood mutual aid network.
            </Text>
          </Animated.View>

          {/* Email Input */}
          <Animated.View 
            entering={FadeInDown.delay(100).duration(600).springify()} 
            className="mb-6"
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

          {/* Password Input */}
          <Animated.View 
            entering={FadeInDown.delay(200).duration(600).springify()} 
            className="mb-10"
          >
            <Text className="text-text font-sans text-sm mb-2 font-semibold dark:text-lg">
              Password
            </Text>
            <View className="flex-row items-center bg-surface border border-surface-highlight dark:border-senior dark:border-border rounded-xl dark:rounded-senior px-4 py-3 dark:py-4">
              <Lock color={iconColor} size={isSeniorMode ? 26 : 20} className="mr-3" />
              <TextInput
                className="flex-1 ml-2 text-text font-sans text-base dark:text-lg"
                placeholder="Enter your password"
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

          {/* Login Button */}
          <Animated.View entering={FadeInDown.delay(300).duration(600).springify()}>
            <TouchableOpacity
              className="bg-primary py-4 dark:py-5 rounded-xl dark:rounded-senior items-center flex-row justify-center mb-6"
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-on-primary font-sans text-lg dark:text-xl font-bold">
                  Log In
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Navigation to Signup */}
          <Animated.View 
            entering={FadeInUp.delay(500).duration(600).springify()} 
            className="flex-row justify-center mt-auto"
          >
            <Text className="text-text-muted font-sans text-base dark:text-lg">
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity 
              onPress={() => router.push("/(auth)/signup")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-secondary font-sans text-base dark:text-lg font-bold dark:text-text dark:underline">
                Sign Up
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
