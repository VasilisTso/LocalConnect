// custom storage adapter using expo-secure-store so 
// authentication tokens persist safely across app launches

// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// Advanced Custom storage adapter for React Native using expo-secure-store
// This safely bypasses the 2048-byte native limit by chunking the session string.
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      // Check if this key was chunked
      const chunkCountStr = await SecureStore.getItemAsync(`${key}_count`);
      if (!chunkCountStr) {
        // Not chunked, return standard item
        return await SecureStore.getItemAsync(key);
      }
      
      // Stitch chunks back together
      const chunkCount = parseInt(chunkCountStr, 10);
      let fullString = '';
      for (let i = 0; i < chunkCount; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
        if (chunk) fullString += chunk;
      }
      return fullString;
    } catch (error) {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (value.length < 2000) {
        await SecureStore.setItemAsync(key, value);
        await SecureStore.deleteItemAsync(`${key}_count`); // Clean up old chunks if any
      } else {
        // Split string into 2000 character chunks
        const chunks = value.match(/.{1,2000}/g) || [];
        await SecureStore.setItemAsync(`${key}_count`, chunks.length.toString());
        for (let i = 0; i < chunks.length; i++) {
          await SecureStore.setItemAsync(`${key}_${i}`, chunks[i]);
        }
      }
    } catch (error) {
      console.error('SecureStore setItem error: ', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      const chunkCountStr = await SecureStore.getItemAsync(`${key}_count`);
      if (chunkCountStr) {
        const chunkCount = parseInt(chunkCountStr, 10);
        for (let i = 0; i < chunkCount; i++) {
          await SecureStore.deleteItemAsync(`${key}_${i}`);
        }
        await SecureStore.deleteItemAsync(`${key}_count`);
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error: ', error);
    }
  },
};

// no hardcode keys in production, environment variables.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables! Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});