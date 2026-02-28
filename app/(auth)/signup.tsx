import { supabase } from "@/lib/supabase";
import { AuthError } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

  async function handleSignup() {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
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

      Alert.alert("Success!", "Your account has been created.");
      // Router will automatically redirect to /(tabs) via RootLayout listener
    } catch (error) {
      const authError = error as AuthError;
      Alert.alert(
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
          <View className="mb-10 items-center">
            <Text className="text-3xl font-sans font-bold text-secondary mb-2">
              Create Account
            </Text>
            <Text className="text-text-muted font-sans text-base text-center">
              Join your neighborhood today.
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-text font-sans text-sm mb-1 font-semibold">
              Email
            </Text>
            <View className="flex-row items-center bg-surface border border-surface-highlight rounded-xl px-4 py-3">
              <Mail color="#FFD167" size={20} className="mr-3" />
              <TextInput
                className="flex-1 ml-2 text-text font-sans text-base"
                placeholder="Enter your email"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View className="mb-8">
            <Text className="text-text font-sans text-sm mb-1 font-semibold">
              Password
            </Text>
            <View className="flex-row items-center bg-surface border border-surface-highlight rounded-xl px-4 py-3">
              <Lock color="#FFD167" size={20} className="mr-3" />
              <TextInput
                className="flex-1 ml-2 text-text font-sans text-base"
                placeholder="Choose a strong password"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                // Bind the secure entry to the inverse of our state
                secureTextEntry={!showPassword}
              />
              {/* Add the toggle button */}
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="p-1 ml-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff color="#64748B" size={20} />
                ) : (
                  <Eye color="#64748B" size={20} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            className="bg-secondary py-4 rounded-xl items-center flex-row justify-center mb-4"
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#1F1C2C" />
            ) : (
              <Text className="text-text font-sans text-lg font-bold">
                Sign Up
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-2">
            <Text className="text-text-muted font-sans text-base">
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-sans text-base font-bold">
                Log In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
