import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  Switch, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Image,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  LogOut, User as UserIcon, ShieldAlert, Award, Phone, Shield, Camera, 
  ChevronRight, Settings, Lock, HelpCircle, Info, CheckCircle, Sparkles
} from 'lucide-react-native';
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

// Quick helper to format dates for recent activity
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Define the interface for the recent tasks
interface RecentTask {
  id: string;
  title: string;
  category: string;
  created_at: string;
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
  const { session, isSeniorMode, toggleSeniorMode, userProfile, fetchUserProfile, showAlert } = useAppStore();
  
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [karma, setKarma] = useState(0);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);

  // Colors for icons dynamically matched to theme
  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
  const mutedIconColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  // FETCH ON TAB FOCUS: This ensures your Karma updates instantly when you switch tabs!
  useFocusEffect(
    useCallback(() => {
      async function fetchProfileData() {
        if (!session?.user?.id) return;
        
        // Fetch Profile (Karma)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('karma_points')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setKarma(profileData.karma_points || 0);
        }

        // Fetch 3 Most Recent Completed Tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, title, category, created_at')
          .eq('helper_id', session.user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(3);

        if (tasksData) {
          setRecentTasks(tasksData);
        }
      }
      fetchProfileData();
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
      showAlert("Upload Error", error.message);
    } finally {
      setUploadingImage(false);
    }
  }

  // Handle logging out
  async function handleSignOut() {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      showAlert('Error signing out', error.message);
    }
    setLoading(false);
    // layout.tsx listener will automatically detect the sign out and route to login
  }

  // Helper to open the phone dialer
  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const avatarSize = isSeniorMode ? 100 : 90;
  const currentBadge = getBadge(karma);
  const BadgeIcon = currentBadge.icon;

  // Reusable component for the settings links
  const SettingRow = ({ icon: Icon, title, route, isLast = false }: any) => (
    <TouchableOpacity 
      onPress={() => router.push(route)} 
      activeOpacity={0.7}
      className={`flex-row items-center justify-between py-4 px-5 bg-surface ${!isLast ? 'border-b border-border dark:border-senior/50' : ''}`}
    >
      <View className="flex-row items-center">
        <View className="bg-surface p-2 rounded-lg mr-4">
          <Icon color={primaryIconColor} size={isSeniorMode ? 24 : 20} />
        </View>
        <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-base'}`}>
          {title}
        </Text>
      </View>
      <ChevronRight color={mutedIconColor} size={isSeniorMode ? 24 : 20} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="items-center mb-6">
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
        </View>

        {/* STATS & BADGE CONTAINER */}
        <View className="bg-surface rounded-2xl dark:rounded-senior p-5 mb-8 border border-border dark:border-senior shadow-sm flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="p-3 rounded-full mr-3" style={{ backgroundColor: `${currentBadge.color}15` }}>
              <BadgeIcon color={currentBadge.color} size={isSeniorMode ? 28 : 24} />
            </View>
            <View>
              <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-base' : 'text-xs'}`}>Community Status</Text>
              <Text className={`font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`} style={{ color: currentBadge.color }}>
                {currentBadge.title}
              </Text>
            </View>
          </View>
          <View className="items-center pl-10 border-l border-border dark:border-senior/50">
            <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-base' : 'text-xs'}`}>Total Karma</Text>
            <Text className={`font-sans font-bold text-secondary ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
              {karma}
            </Text>
          </View>
        </View>

        {/* RECENT ACTIVITY */}
        <View className="mb-8">
          <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
            Recent Activity
          </Text>
          
          {recentTasks.length > 0 ? (
            <View className="bg-surface rounded-2xl dark:rounded-senior border border-border dark:border-senior overflow-hidden">
              {recentTasks.map((task, index) => (
                <View 
                  key={task.id} 
                  className={`flex-row items-center justify-between p-4 ${index !== recentTasks.length - 1 ? 'border-b border-border dark:border-senior/50' : ''}`}
                >
                  <View className="flex-row items-center flex-1 pr-4">
                    <CheckCircle color={Colors.light.success} size={isSeniorMode ? 24 : 20} className="mr-3" />
                    <View className="flex-1 ml-4">
                      <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-lg' : 'text-base'}`} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-base' : 'text-xs'}`}>
                        Helped with {task.category}
                      </Text>
                    </View>
                  </View>
                  <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-base' : 'text-xs'}`}>
                    {formatDate(task.created_at)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-surface rounded-2xl p-6 border border-border dark:border-senior items-center">
              <Shield color={mutedIconColor} size={32} className="mb-2 opacity-50" />
              <Text className={`text-text-muted font-sans text-center ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
                No completed tasks yet. Head to the feed to help a neighbor!
              </Text>
            </View>
          )}
        </View>

        {/* SETTINGS LINKS */}
        <View className="mb-8">
          <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
            Settings
          </Text>
          <View className="bg-surface rounded-2xl dark:rounded-senior border border-border dark:border-senior overflow-hidden shadow-sm">
            <SettingRow icon={Settings} title="Edit Profile" route="/edit-profile" />
            <SettingRow icon={Lock} title="Security & Privacy" route="/security" />
            <SettingRow icon={HelpCircle} title="Help & Support" route="/support" />
            <SettingRow icon={Sparkles} title="Ask AI Guide" route="/chat" />
            <SettingRow icon={Info} title="About the App" route="/about" isLast />
          </View>
        </View>

        {/* EMERGENCY CONTACTS (ONLY VISIBLE IN SENIOR MODE) */}
        {isSeniorMode && (
          <View className="bg-surface border-senior border-error rounded-senior p-5 mb-6 shadow-sm">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-text font-sans font-bold text-2xl">Emergency</Text>
              <Phone color={Colors.dark.error} size={28} />
            </View>
            
            <TouchableOpacity onPress={() => handleCall('112')} className="bg-background py-4 px-5 rounded-md flex-row justify-between items-center mb-4 border-senior border-border active:opacity-70">
              <Text className="text-text font-sans font-bold text-xl">General</Text>
              <Text className="text-error font-sans font-extrabold text-2xl">112</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => handleCall('166')} className="bg-background py-4 px-5 rounded-md flex-row justify-between items-center mb-4 border-senior border-border active:opacity-70">
              <Text className="text-text font-sans font-bold text-xl">Ambulance</Text>
              <Text className="text-error font-sans font-extrabold text-2xl">166</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleCall('100')} className="bg-background py-4 px-5 rounded-md flex-row justify-between items-center border-senior border-border active:opacity-70">
              <Text className="text-text font-sans font-bold text-xl">Police</Text>
              <Text className="text-error font-sans font-extrabold text-2xl">100</Text>
            </TouchableOpacity>
          </View>
        )}

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