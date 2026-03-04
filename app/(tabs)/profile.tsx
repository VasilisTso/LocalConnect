import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  Switch, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User as UserIcon, Tag, ShieldAlert, Award, Phone, Shield, Footprints, Car, Camera } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

// Helper function to determine badge status based on Karma points
function getBadge(karma: number) {
  if (karma < 0) return { title: 'Flagged Account', color: '#EF4444', icon: ShieldAlert };
  if (karma < 50) return { title: 'New Neighbor', color: '#64748B', icon: UserIcon };
  if (karma < 150) return { title: 'Active Helper', color: '#5F4B8B', icon: Shield };
  return { title: 'Local Hero', color: '#D97706', icon: Award }; // 150+ points
}

/**
 * @description User Profile & Settings Screen
 * Human-Centric Goal: Centralized hub for user preferences and accessibility.
 * Adaptivity Connection: Directly controls the global `isSeniorMode` state and 
 * allows users to update their interest tags, which feeds the smart sorting engine.
 */
export default function ProfileScreen() {
  const router = useRouter();
  
  // Pull our global state and actions from Zustand
  const { session, isSeniorMode, toggleSeniorMode, userProfile, fetchUserProfile } = useAppStore();
  
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [userTags, setUserTags] = useState<string[]>([]);
  const [karma, setKarma] = useState(0);

  // Transport Mode State
  const [transportMode, setTransportMode] = useState<'walking' | 'driving'>('walking');

  // A preset list of tags for our neighborhood app
  const AVAILABLE_TAGS = [
    "Pets", "Education", "Tools", "Errands", "Tech", 
    "Cars", "Music", "Entertainment", "Home & Garden", "Fitness"
  ];

  // FETCH ON TAB FOCUS: This ensures your Karma updates instantly when you switch tabs!
  useFocusEffect(
    useCallback(() => {
      async function fetchProfile() {
        if (!session?.user?.id) return;
        
        const { data, error } = await supabase
          .from('profiles')
          .select('tags, karma_points, transport_mode')
          .eq('id', session.user.id)
          .single();

        if (data) {
          if (data.tags) setUserTags(data.tags);
          // Safely set karma, defaulting to 0 if it's null
          setKarma(data.karma_points || 0);
          if (data.transport_mode) setTransportMode(data.transport_mode);
        }
      }
      fetchProfile();
    }, [session])
  );

  // IMAGE UPLOAD LOGIC
  async function handlePickImage() {
    try {
      // Ask the user to pick an image AND request the base64 data
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, 
        aspect: [1, 1],
        quality: 0.5, 
        base64: true, // Tell Expo we want the raw image data
      });

      if (result.canceled || !result.assets[0] || !result.assets[0].base64) return;

      setUploadingImage(true);
      const photoUri = result.assets[0].uri;
      const base64FileData = result.assets[0].base64;
      
      const fileExt = photoUri.split('.').pop() || 'jpeg';
      const fileName = `${session?.user?.id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase using the 'decode' function to bypass fetch
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(base64FileData), {
          contentType: `image/${fileExt}`,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      // Update the user's profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session?.user?.id);

      if (updateError) throw updateError;

      // Refresh global state
      if (session?.user?.id) {
        await fetchUserProfile(session.user.id);
      }
      
    } catch (error: any) {
      Alert.alert("Upload Error", error.message);
    } finally {
      setUploadingImage(false);
    }
  }

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

  // Update Transport Mode in DB instantly
  async function handleTransportMode(mode: 'walking' | 'driving') {
    if (!session?.user?.id) return;
    
    setTransportMode(mode); // Update UI instantly
    
    const { error } = await supabase
      .from('profiles')
      .update({ transport_mode: mode })
      .eq('id', session.user.id);

    if (error) {
      Alert.alert('Error updating transport mode', error.message);
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
    // layout.tsx listener will automatically detect the sign out and route to login
  }

  const avatarSize = isSeniorMode ? 100 : 80;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View className="items-center mb-8">
          {/* INTERACTIVE PROFILE PICTURE */}
          <TouchableOpacity 
            onPress={handlePickImage} 
            disabled={uploadingImage}
            className="mb-4 relative"
          >
            {userProfile?.avatar_url ? (
              <Image 
                source={{ uri: userProfile.avatar_url }} 
                style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }} 
              />
            ) : (
              <View className="bg-surface-highlight p-6 rounded-full" style={{ width: avatarSize, height: avatarSize, alignItems: 'center', justifyContent: 'center' }}>
                <UserIcon color="#5F4B8B" size={isSeniorMode ? 48 : 36} />
              </View>
            )}
            
            {/* Little Camera Badge */}
            <View className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-background">
              <Camera color="#FFFFFF" size={14} />
            </View>

            {/* Loading Overlay */}
            {uploadingImage && (
              <View className="absolute inset-0 bg-black/40 rounded-full items-center justify-center">
                <ActivityIndicator color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
          
          {/* username */}
          <Text className={`text-text font-sans font-bold mb-1 ${isSeniorMode ? 'text-3xl' : 'text-2xl'}`}>
            {userProfile?.username ? userProfile.username : 'Neighbor'}
          </Text>
          
          {/* The actual email rendered smaller underneath */}
          <Text className={`text-text-muted font-sans mb-4 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
            {session?.user?.email}
          </Text>

          {/*KARMA BADGE - HIDE GAMIFICATION IN SENIOR MODE */}
          {!isSeniorMode && (
            <View className="flex-row items-center mt-1">
              {/* Score Bubble */}
              <View className="flex-row items-center bg-secondary/20 px-4 py-2 rounded-l-full border border-secondary border-r-0">
                <Award color="#D97706" size={18} className="mr-2" />
                <Text className="text-text ml-1 font-sans font-bold text-base">
                  {karma} pts
                </Text>
              </View>
              
              {/* Dynamic Title Bubble */}
              <View 
                className="flex-row items-center px-4 py-2 rounded-r-full border"
                style={{ backgroundColor: `${getBadge(karma).color}20`, borderColor: getBadge(karma).color }}
              >
                <Text className="font-sans font-bold text-sm" style={{ color: getBadge(karma).color }}>
                  {getBadge(karma).title}
                </Text>
              </View>
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

        {/* Mobility & Reach Section */}
        <View className="bg-surface rounded-2xl p-4 mb-6 border border-surface-highlight">
          <Text className={`text-text font-sans font-bold mb-1 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
            Mobility & Reach
          </Text>
          <Text className={`text-text-muted font-sans mb-4 ${isSeniorMode ? 'text-base' : 'text-sm'}`}>
            How far can you travel to help neighbors? This limits tasks on your feed.
          </Text>

          <View className="flex-row gap-4">
            <TouchableOpacity 
              onPress={() => handleTransportMode('walking')}
              className={`flex-1 flex-row items-center justify-center p-3 rounded-xl border ${transportMode === 'walking' ? 'bg-primary border-primary' : 'bg-transparent border-surface-highlight'}`}
            >
              <Footprints color={transportMode === 'walking' ? '#FFFFFF' : '#64748B'} size={20} className="mr-2" />
              <View className='ml-2'>
                <Text className={`font-sans font-bold ${transportMode === 'walking' ? 'text-white' : 'text-text'} ${isSeniorMode ? 'text-xl' : 'text-base'}`}>Walking</Text>
                <Text className={`font-sans ${transportMode === 'walking' ? 'text-[#E2D8F0]' : 'text-text-muted'} ${isSeniorMode ? 'text-sm' : 'text-xs'}`}>7.5 km</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => handleTransportMode('driving')}
              className={`flex-1 flex-row items-center justify-center p-3 rounded-xl border ${transportMode === 'driving' ? 'bg-primary border-primary' : 'bg-transparent border-surface-highlight'}`}
            >
              <Car color={transportMode === 'driving' ? '#FFFFFF' : '#64748B'} size={20} className="mr-2" />
              <View className='ml-2'>
                <Text className={`font-sans font-bold ${transportMode === 'driving' ? 'text-white' : 'text-text'} ${isSeniorMode ? 'text-xl' : 'text-base'}`}>Driving</Text>
                <Text className={`font-sans ${transportMode === 'driving' ? 'text-[#E2D8F0]' : 'text-text-muted'} ${isSeniorMode ? 'text-sm' : 'text-xs'}`}>35.0 km</Text>
              </View>
            </TouchableOpacity>
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