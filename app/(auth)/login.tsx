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

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
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
      Alert.alert(
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
          <View className="mb-10 items-center">
            <Text className="text-4xl font-sans font-bold text-primary mb-2">
              LocalConnect
            </Text>
            <Text className="text-text-muted font-sans text-base text-center">
              Your neighborhood mutual aid network.
            </Text>
          </View>

          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-text font-sans text-sm mb-1 font-semibold">
              Email
            </Text>
            <View className="flex-row items-center bg-surface border border-surface-highlight rounded-xl px-4 py-3">
              <Mail color="#5F4B8B" size={20} className="mr-3" />
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

          {/* Password Input */}
          <View className="mb-8">
            <Text className="text-text font-sans text-sm mb-1 font-semibold">
              Password
            </Text>
            <View className="flex-row items-center bg-surface border border-surface-highlight rounded-xl px-4 py-3">
              <Lock color="#5F4B8B" size={20} className="mr-3" />
              <TextInput
                className="flex-1 ml-2 text-text font-sans text-base"
                placeholder="Enter your password"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                // Bind the secure entry to the inverse of our state
                secureTextEntry={!showPassword}
              />
              {/*Add the toggle button */}
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="p-1 ml-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Makes it easier to tap
              >
                {showPassword ? (
                  <EyeOff color="#64748B" size={20} />
                ) : (
                  <Eye color="#64748B" size={20} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className="bg-primary py-4 rounded-xl items-center flex-row justify-center mb-4"
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-sans text-lg font-bold">
                Log In
              </Text>
            )}
          </TouchableOpacity>

          {/* Navigation to Signup */}
          <View className="flex-row justify-center">
            <Text className="text-text-muted font-sans text-base">
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text className="text-secondary font-sans text-base font-bold">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
