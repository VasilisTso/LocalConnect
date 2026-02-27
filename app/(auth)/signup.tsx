import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

/**
 * @description Authentication Signup Screen
 * Human-Centric Goal: Clear, guided onboarding. 
 * Architectural Note: Upon successful auth signup, this component immediately 
 * creates a default row in the `public.profiles` table so the Adaptivity Engine 
 * has a baseline (karma = 0, transport = walking) to work with immediately.
 */
export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function handleSignup() {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Initialize their Adaptivity Profile immediately
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: authData.user.id,
              transport_mode: 'walking', // Default mode
              tags: [], // Empty default tags
              karma_points: 0
            }
          ]);
          
        if (profileError) {
          console.error("Profile initialization failed:", profileError);
          // We don't throw here to avoid completely blocking the user, 
          // but we log it for debugging.
        }
      }

      Alert.alert('Success!', 'Your account has been created.');
      // Router will automatically redirect to /(tabs) via RootLayout listener
      
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        // FIX: Remove behavior='height' on Android to stop UI conflict
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          // FIX: Let iOS manage scroll insets smoothly
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-10 items-center">
            <Text className="text-3xl font-sans font-bold text-secondary mb-2">Create Account</Text>
            <Text className="text-text-muted font-sans text-base text-center">
              Join your neighborhood today.
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-text font-sans text-sm mb-1 font-semibold">Email</Text>
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
            <Text className="text-text font-sans text-sm mb-1 font-semibold">Password</Text>
            <View className="flex-row items-center bg-surface border border-surface-highlight rounded-xl px-4 py-3">
              <Lock color="#FFD167" size={20} className="mr-3" />
              <TextInput
                className="flex-1 ml-2 text-text font-sans text-base"
                placeholder="Choose a strong password"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
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
              <Text className="text-text font-sans text-lg font-bold">Sign Up</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-2">
            <Text className="text-text-muted font-sans text-base">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-sans text-base font-bold">Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}