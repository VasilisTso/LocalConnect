import React, { useState, useEffect, useCallback } from 'react';
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
import { LogOut, User as UserIcon, Tag, ShieldAlert, Award, Phone } from 'lucide-react-native';
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
  const [karma, setKarma] = useState(0);

  // A preset list of tags for our neighborhood app
  const AVAILABLE_TAGS = ['Pets', 'Education', 'Tools', 'Errands', 'Tech Support'];

  // Fetch the user's current tags from the database on load
  useEffect(() => {
    async function fetchProfile() {
      if (!session?.user?.id) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('tags, karma_points')
        .eq('id', session.user.id)
        .single();

      if (data) {
        if (data.tags) setUserTags(data.tags);
        if (data.karma_points) setKarma(data.karma_points);
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
      <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View className="items-center mb-8">
          <View className="bg-surface-highlight p-6 rounded-full mb-4">
            <UserIcon color="#5F4B8B" size={isSeniorMode ? 64 : 48} />
          </View>
          <Text className={`text-text font-sans font-bold mb-2 ${isSeniorMode ? 'text-3xl' : 'text-2xl'}`}>
            {session?.user?.email || 'User'}
          </Text>

          {/*KARMA BADGE - HIDE GAMIFICATION IN SENIOR MODE */}
          {!isSeniorMode && (
            <View className="flex-row items-center bg-secondary/20 px-4 py-2 rounded-full border border-secondary">
              <Award color="#D97706" size={20} className="mr-2" />
              <Text className="text-text ml-2 font-sans font-bold text-base">
                {karma} Karma Points
              </Text>
            </View>
          )}
        </View>

        {/* Accessibility & Adaptivity Section */}
        <View className="bg-surface rounded-2xl p-4 mb-6 border border-surface-highlight">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1 pr-4">
              <ShieldAlert color="#5F4B8B" size={28} className="mr-3" />
              <View className='ml-2'>
                {/* DYNAMIC TYPOGRAPHY */}
                <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
                  Senior Mode
                </Text>
                <Text className={`text-text-muted font-sans mt-1 ${isSeniorMode ? 'text-base' : 'text-sm'}`}>
                  Enables high contrast, large text, and emergency tools.
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

        {/* EMERGENCY CONTACTS (ONLY VISIBLE IN SENIOR MODE) */}
        {isSeniorMode && (
          <View className="bg-error/10 border-2 border-error rounded-2xl p-4 mb-6">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-text font-sans font-bold text-2xl">Emergency Contacts</Text>
              <Phone color="#D32F2F" size={28} className="mr-3" />
            </View>
            
            <TouchableOpacity className="bg-surface py-4 px-4 rounded-xl flex-row justify-between items-center mb-3 border border-surface-highlight">
              <Text className="text-text font-sans font-bold text-xl">General Emergency</Text>
              <Text className="text-error font-sans font-bold text-2xl">112</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="bg-surface py-4 px-4 rounded-xl flex-row justify-between items-center mb-3 border border-surface-highlight">
              <Text className="text-text font-sans font-bold text-xl">Ambulance (EKAB)</Text>
              <Text className="text-error font-sans font-bold text-2xl">166</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-surface py-4 px-4 rounded-xl flex-row justify-between items-center border border-surface-highlight">
              <Text className="text-text font-sans font-bold text-xl">Police</Text>
              <Text className="text-error font-sans font-bold text-2xl">100</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Interests / Tags Section (Crucial for Thesis Feed) */}
        <View className="bg-surface rounded-2xl p-4 mb-8 border border-surface-highlight">
          <View className="flex-row items-center mb-4">
            <Tag color="#5F4B8B" size={24} className="mr-3" />
            <Text className={`text-text ml-2 font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
              My Interests
            </Text>
          </View>
          <Text className={`text-text-muted font-sans mb-4 ${isSeniorMode ? 'text-base' : 'text-sm'}`}>
            Select what you care about. Your feed will automatically adapt.
          </Text>
          
          <View className="flex-row flex-wrap gap-3 mt-4">
            {AVAILABLE_TAGS.map((tag) => {
              const isActive = userTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => handleToggleTag(tag)}
                  className={`px-4 py-3 rounded-full border ${
                    isActive ? 'bg-primary border-primary' : 'bg-transparent border-text-muted'
                  }`}
                >
                  <Text className={`font-sans font-semibold ${
                    isActive ? 'text-white' : 'text-text-muted'
                  } ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
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
              <LogOut color="#FFFFFF" size={24} className="mr-2" />
              <Text className={`text-white font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
                Sign Out
              </Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}