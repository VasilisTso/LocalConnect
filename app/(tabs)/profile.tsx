import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Switch, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User as UserIcon, Tag, ShieldAlert } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'expo-router';

/**
 * @description User Profile & Settings Screen
 * Human-Centric Goal: Centralized hub for user preferences and accessibility.
 * Adaptivity Connection: Directly controls the global `isSeniorMode` state and 
 * allows users to update their interest tags, which feeds the smart sorting engine.
 */
export default function ProfileScreen() {
  const router = useRouter();
  
  // Pull our global state and actions from Zustand
  const { session, isSeniorMode, toggleSeniorMode } = useAppStore();
  
  const [loading, setLoading] = useState(false);
  const [userTags, setUserTags] = useState<string[]>([]);

  // A preset list of tags for our neighborhood app
  const AVAILABLE_TAGS = ['Pets', 'Education', 'Tools', 'Errands', 'Tech Support'];

  // Fetch the user's current tags from the database on load
  useEffect(() => {
    async function fetchProfile() {
      if (!session?.user?.id) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('tags')
        .eq('id', session.user.id)
        .single();

      if (data && data.tags) {
        setUserTags(data.tags);
      }
    }
    fetchProfile();
  }, [session]);

  // Toggle a tag on/off and save to Supabase
  async function handleToggleTag(tag: string) {
    if (!session?.user?.id) return;
    
    // Determine if we are adding or removing the tag
    const newTags = userTags.includes(tag) 
      ? userTags.filter(t => t !== tag) 
      : [...userTags, tag];

    setUserTags(newTags); // Update UI instantly

    // Persist to database for the Adaptivity Engine
    const { error } = await supabase
      .from('profiles')
      .update({ tags: newTags })
      .eq('id', session.user.id);

    if (error) {
      Alert.alert('Error updating tags', error.message);
    }
  }

  // Handle logging out
  async function handleSignOut() {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error signing out', error.message);
    }
    setLoading(false);
    // Note: Our _layout.tsx listener will automatically detect the sign out and route to login!
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        
        {/* Header Section */}
        <View className="items-center mb-8">
          <View className="bg-surface-highlight p-6 rounded-full mb-4">
            <UserIcon color="#5F4B8B" size={isSeniorMode ? 64 : 48} />
          </View>
          <Text className="text-text font-sans font-bold text-2xl">
            {session?.user?.email || 'User'}
          </Text>
        </View>

        {/* Accessibility & Adaptivity Section */}
        <View className="bg-surface rounded-2xl p-4 mb-6 border border-surface-highlight">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1 pr-4">
              <ShieldAlert color="#5F4B8B" size={24} className="mr-3" />
              <View>
                <Text className="text-text font-sans font-bold text-lg">Senior Mode</Text>
                <Text className="text-text-muted font-sans text-sm mt-1">
                  Enables high contrast and larger navigation elements.
                </Text>
              </View>
            </View>
            <Switch 
              value={isSeniorMode} 
              onValueChange={toggleSeniorMode}
              trackColor={{ false: '#E9ECEF', true: '#5F4B8B' }}
              thumbColor={isSeniorMode ? '#FFD167' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Interests / Tags Section (Crucial for Thesis Feed) */}
        <View className="bg-surface rounded-2xl p-4 mb-8 border border-surface-highlight">
          <View className="flex-row items-center mb-4">
            <Tag color="#5F4B8B" size={24} className="mr-3" />
            <Text className="text-text font-sans font-bold text-lg">My Interests</Text>
          </View>
          <Text className="text-text-muted font-sans text-sm mb-4">
            Select what you care about. Your feed will automatically adapt to prioritize these tasks.
          </Text>
          
          <View className="flex-row flex-wrap gap-2">
            {AVAILABLE_TAGS.map((tag) => {
              const isActive = userTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => handleToggleTag(tag)}
                  className={`px-4 py-2 rounded-full border ${
                    isActive 
                      ? 'bg-primary border-primary' 
                      : 'bg-transparent border-text-muted'
                  }`}
                >
                  <Text className={`font-sans font-semibold ${
                    isActive ? 'text-white' : 'text-text-muted'
                  }`}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity 
          className="bg-error py-4 rounded-xl items-center flex-row justify-center"
          onPress={handleSignOut}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <LogOut color="#FFFFFF" size={20} className="mr-2" />
              <Text className="text-white font-sans text-lg font-bold">Sign Out</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}