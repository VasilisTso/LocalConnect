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
import Colors from '@/constants/Colors';

// Helper function to determine badge status based on Karma points
function getBadge(karmaPoints: number) {
  if (karmaPoints < 0) return { title: 'Flagged Account', color: Colors.light.error, icon: ShieldAlert };
  if (karmaPoints < 50) return { title: 'New Neighbor', color: Colors.light.tabIconDefault, icon: UserIcon };
  if (karmaPoints < 150) return { title: 'Active Helper', color: Colors.light.primary, icon: Shield };
  return { title: 'Local Hero', color: Colors.light.secondary, icon: Award }; 
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

  // Colors for icons dynamically matched to theme
  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
  const mutedIconColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

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

  // isSenior toggle for database
  async function handleToggleSeniorMode(newValue: boolean) {
    // Optimistically update the local UI instantly for a snappy feel
    toggleSeniorMode();

    if (session?.user?.id) {
      // Silently update the database in the background
      const { error } = await supabase
        .from('profiles')
        .update({ is_senior: newValue })
        .eq('id', session.user.id);

      // If the database fails (e.g., lost internet), revert the UI and warn them
      if (error) {
        toggleSeniorMode(); // Revert back
        Alert.alert('Network Error', 'Could not save your accessibility settings. Please check your connection.');
      }
    }
  }

  const avatarSize = isSeniorMode ? 100 : 90;
  const currentBadge = getBadge(karma);
  const BadgeIcon = currentBadge.icon;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="items-center mb-8">
          {/* INTERACTIVE PROFILE PICTURE */}
          <TouchableOpacity 
            onPress={handlePickImage} 
            disabled={uploadingImage}
            className={`mb-4 relative rounded-full ${isSeniorMode ? 'border-senior border-border' : ''}`}
          >
            {userProfile?.avatar_url ? (
              <Image 
                source={{ uri: userProfile.avatar_url }} 
                style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }} 
              />
            ) : (
              <View 
                className="bg-surface p-6 rounded-full border border-border dark:border-0" 
                style={{ width: avatarSize, height: avatarSize, alignItems: 'center', justifyContent: 'center' }}
              >
                <UserIcon color={primaryIconColor} size={isSeniorMode ? 46 : 40} />
              </View>
            )}
            
            {/* Little Camera Badge */}
            <View className="absolute bottom-0 right-0 bg-primary dark:bg-black p-2 rounded-full border-2 border-background dark:border-white">
              <Camera color="#FFFFFF" size={isSeniorMode ? 18 : 16} />
            </View>

            {/* Loading Overlay */}
            {uploadingImage && (
              <View className="absolute inset-0 bg-black/60 rounded-full items-center justify-center">
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
            <View className="items-center mt-2 gap-2">
              {/* Pill 1: Points */}
              <View className="flex-row items-center bg-secondary/15 px-4 py-2 rounded-full border border-secondary">
                <Award color={Colors.light.secondary} size={18} className="mr-2" />
                <Text className="text-secondary font-sans font-bold text-base">
                  {karma} Points
                </Text>
              </View>
              
              {/* Pill 2: Badge */}
              <View 
                className="flex-row items-center px-4 py-1.5 rounded-full border"
                style={{ backgroundColor: `${currentBadge.color}15`, borderColor: currentBadge.color }}
              >
                <BadgeIcon color={currentBadge.color} size={16} className="mr-2" />
                <Text className="font-sans ml-2 font-bold text-sm" style={{ color: currentBadge.color }}>
                  {currentBadge.title}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Accessibility & Adaptivity Section */}
        <View className="bg-surface rounded-2xl p-5 mb-6 border border-border dark:border-senior dark:border-border dark:rounded-senior">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-4">
              <ShieldAlert color={primaryIconColor} size={isSeniorMode ? 32 : 28} className="mr-4" />
              <View className="flex-1 ml-2">
                <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
                  Senior Mode
                </Text>
                <Text className={`text-text-muted font-sans mt-1 ${isSeniorMode ? 'text-base leading-6' : 'text-sm'}`}>
                  Enables high contrast, large text, and emergency tools.
                </Text>
              </View>
            </View>
            <Switch
              value={isSeniorMode} 
              onValueChange={handleToggleSeniorMode}
              trackColor={{ false: Colors.light.border, true: isSeniorMode ? Colors.dark.primary : Colors.light.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Mobility & Reach Section */}
        <View className="bg-surface rounded-2xl p-5 mb-6 border border-border dark:border-senior dark:border-border dark:rounded-xl">
          <Text className={`text-text font-sans font-bold mb-2 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
            Mobility & Reach
          </Text>
          <Text className={`text-text-muted font-sans mb-5 ${isSeniorMode ? 'text-lg leading-6' : 'text-sm'}`}>
            How far can you travel to help neighbors? This filters tasks on your feed.
          </Text>

          <View className={`flex-row gap-4 ${isSeniorMode ? 'flex-col' : ''}`}>
            <TouchableOpacity 
              onPress={() => handleTransportMode('walking')}
              activeOpacity={0.7}
              className={`flex-1 flex-row items-center justify-center p-4 rounded-xl border-2 dark:rounded-senior dark:border-senior ${
                transportMode === 'walking' 
                  ? 'bg-primary border-primary dark:bg-primary dark:border-primary' 
                  : 'bg-transparent border-border dark:border-border'
              }`}
            >
              <Footprints color={transportMode === 'walking' ? '#FFFFFF' : mutedIconColor} size={isSeniorMode ? 26 : 20} className="mr-3" />
              <View className='ml-2'>
                <Text className={`font-sans font-bold ${transportMode === 'walking' ? 'text-white dark:text-white' : 'text-text'} ${isSeniorMode ? 'text-xl' : 'text-base'}`}>Walking</Text>
                <Text className={`font-sans ${transportMode === 'walking' ? 'text-white/80 dark:text-white' : 'text-text-muted'} ${isSeniorMode ? 'text-base' : 'text-xs'}`}>7.5 km</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => handleTransportMode('driving')}
              activeOpacity={0.7}
              className={`flex-1 flex-row items-center justify-center p-4 rounded-xl border-2 dark:rounded-senior dark:border-senior ${
                transportMode === 'driving' 
                  ? 'bg-primary border-primary dark:bg-primary dark:border-primary' 
                  : 'bg-transparent border-border dark:border-border'
              }`}
            >
              <Car color={transportMode === 'driving' ? '#FFFFFF' : mutedIconColor} size={isSeniorMode ? 26 : 20} className="mr-3" />
              <View className='ml-2'>
                <Text className={`font-sans font-bold ${transportMode === 'driving' ? 'text-white dark:text-white' : 'text-text'} ${isSeniorMode ? 'text-xl' : 'text-base'}`}>Driving</Text>
                <Text className={`font-sans ${transportMode === 'driving' ? 'text-white/80 dark:text-white' : 'text-text-muted'} ${isSeniorMode ? 'text-base' : 'text-xs'}`}>35.0 km</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* EMERGENCY CONTACTS (ONLY VISIBLE IN SENIOR MODE) */}
        {isSeniorMode && (
          <View className="bg-surface border-senior border-error rounded-senior p-5 mb-6 shadow-sm">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-text font-sans font-bold text-2xl">Emergency</Text>
              <Phone color={Colors.dark.error} size={28} />
            </View>
            
            {/* Added proper margins and active states without hardcoding gray-100 */}
            <TouchableOpacity className="bg-background py-4 px-5 rounded-md flex-row justify-between items-center mb-4 border-senior border-border active:opacity-70">
              <Text className="text-text font-sans font-bold text-xl">General</Text>
              <Text className="text-error font-sans font-extrabold text-2xl">112</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="bg-background py-4 px-5 rounded-md flex-row justify-between items-center mb-4 border-senior border-border active:opacity-70">
              <Text className="text-text font-sans font-bold text-xl">Ambulance</Text>
              <Text className="text-error font-sans font-extrabold text-2xl">166</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-background py-4 px-5 rounded-md flex-row justify-between items-center border-senior border-border active:opacity-70">
              <Text className="text-text font-sans font-bold text-xl">Police</Text>
              <Text className="text-error font-sans font-extrabold text-2xl">100</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Interests / Tags Section (Crucial for Thesis Feed) */}
        <View className="bg-surface rounded-2xl p-5 mb-8 border border-border dark:border-senior dark:border-border dark:rounded-senior">
          <View className="flex-row items-center mb-2">
            <Tag color={primaryIconColor} size={isSeniorMode ? 28 : 24} className="mr-3" />
            <Text className={`text-text ml-2 font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
              My Interests
            </Text>
          </View>
          <Text className={`text-text-muted font-sans mb-5 ${isSeniorMode ? 'text-base leading-6' : 'text-sm'}`}>
            Select what you care about. Your feed will automatically adapt to show relevant tasks.
          </Text>
          
          <View className="flex-row flex-wrap gap-3">
            {AVAILABLE_TAGS.map((tag) => {
              const isActive = userTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  activeOpacity={0.7}
                  onPress={() => handleToggleTag(tag)}
                  className={`px-4 py-2 rounded-full border-2 dark:rounded-senior dark:border-senior ${
                    isActive 
                      ? 'bg-primary border-primary dark:bg-primary dark:border-primary' 
                      : 'bg-transparent border-border dark:border-border'
                  }`}
                >
                  <Text className={`font-sans font-semibold ${
                    isActive ? 'text-white dark:text-white' : 'text-text'
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
          className="bg-error py-4 dark:py-4 rounded-xl dark:rounded-senior dark:border-senior dark:border-error items-center flex-row justify-center active:opacity-80"
          onPress={handleSignOut}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <LogOut color="#FFFFFF" size={isSeniorMode ? 26 : 24} className="mr-3" />
              <Text className={`text-white ml-2 font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
                Sign Out
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}