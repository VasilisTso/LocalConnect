import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Lock, ShieldAlert, Footprints, Car, Tag, Save, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import Colors from '@/constants/Colors';

const AVAILABLE_TAGS = [
  "Pets", "Education", "Tools", "Errands", "Tech", 
  "Cars", "Music", "Entertainment", "Home & Garden", "Fitness"
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { session, isSeniorMode, userProfile, fetchUserProfile, showAlert } = useAppStore();

	const scrollViewRef = useRef<ScrollView>(null);

  // Local state for the form
  const [username, setUsername] = useState(userProfile?.username || '');
  const [seniorMode, setSeniorMode] = useState(isSeniorMode);
  const [transportMode, setTransportMode] = useState<'walking' | 'driving'>(userProfile?.transport_mode || 'walking');
  const [userTags, setUserTags] = useState<string[]>(userProfile?.tags || []);
  
	// Password specific states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Visibility toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
  const mutedIconColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  // Toggle a tag in the local state array
  function handleToggleTag(tag: string) {
    if (userTags.includes(tag)) {
      setUserTags(userTags.filter(t => t !== tag));
    } else {
      setUserTags([...userTags, tag]);
    }
  }

  // Save all changes to the database
  async function handleSaveChanges() {
    if (!session?.user?.id || !session?.user?.email) return;
    
    if (!username.trim()) {
      showAlert("Missing Info", "Please enter a username.");
      return;
    }

    setLoading(true);

    try {
      // Handle Password Change (If they typed anything in the password fields)
      if (newPassword || confirmPassword) {
        
        // Ensure both fields are filled
        if (!newPassword || !confirmPassword) {
          throw new Error("Please fill out both password fields to change your password.");
        }

        // Ensure new passwords match
        if (newPassword !== confirmPassword) {
          throw new Error("Your new passwords do not match.");
        }

        // Directly update the password without requiring the old one
        const { error: updatePasswordError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updatePasswordError) throw updatePasswordError;
      }

      // Update Profile Table (Username, Transport, Tags, Accessibility)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          transport_mode: transportMode,
          tags: userTags,
          is_senior: seniorMode
        })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      showAlert("Success", "Profile updated successfully!");

      // Re-fetch the profile to update the global Zustand store instantly
      await fetchUserProfile(session.user.id);
      
      // Go back to the profile tab
      router.back();

    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        className="flex-1"
				keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        {/* HEADER */}
        <View className="flex-row items-center px-6 pt-4 pb-4 border-b border-border dark:border-senior dark:border-border">
          <TouchableOpacity onPress={() => router.back()} className="mr-2 p-2 -ml-2 active:opacity-70">
            <ArrowLeft color={isSeniorMode ? Colors.dark.text : Colors.light.text} size={isSeniorMode ? 32 : 28} />
          </TouchableOpacity>
          <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
            Edit Profile
          </Text>
        </View>

        <ScrollView 
					ref={scrollViewRef}
					contentContainerStyle={{ padding: 24, paddingBottom: 100 }} 
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
          
          {/* PERSONAL INFO */}
          <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>Personal Info</Text>
          <View className="bg-surface rounded-2xl p-5 mb-8 border border-border dark:border-senior dark:border-border shadow-sm">
            
            <Text className={`text-text font-sans font-semibold mb-2 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>Username</Text>
            <View className="flex-row items-center bg-background border border-border dark:border-senior rounded-xl px-4 py-3 mb-2">
              <User color={mutedIconColor} size={isSeniorMode ? 24 : 20} className="mr-3" />
              <TextInput
                className={`flex-1 ml-1 text-text font-sans ${isSeniorMode ? 'text-lg' : 'text-base'}`}
                placeholder="Your display name"
                placeholderTextColor={mutedIconColor}
                value={username}
                onChangeText={setUsername}
              />
            </View>
          </View>

					{/* CHANGE PASSWORD SECTION */}
          <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>Change Password</Text>
          <View className="bg-surface rounded-2xl p-5 mb-8 border border-border dark:border-senior dark:border-border shadow-sm">
            <Text className={`text-text-muted font-sans mb-5 ${isSeniorMode ? 'text-base leading-6' : 'text-sm'}`}>
              Leave these blank if you do not want to change your password.
            </Text>

            {/* New Password */}
            <Text className={`text-text font-sans font-semibold mb-2 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>New Password</Text>
            <View className="flex-row items-center bg-background border border-border dark:border-senior rounded-xl px-4 py-3 mb-4">
              <Lock color={mutedIconColor} size={isSeniorMode ? 24 : 20} className="mr-3" />
              <TextInput
                className={`flex-1 ml-1 text-text font-sans ${isSeniorMode ? 'text-lg' : 'text-base'}`}
                placeholder="Enter new password"
                placeholderTextColor={mutedIconColor}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
								onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 220, animated: true });
                  }, 100);
                }}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} className="p-1 ml-2">
                {showNewPassword ? <EyeOff color={mutedIconColor} size={20} /> : <Eye color={mutedIconColor} size={20} />}
              </TouchableOpacity>
            </View>

            {/* Confirm New Password */}
            <Text className={`text-text font-sans font-semibold mb-2 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>Confirm New Password</Text>
            <View className="flex-row items-center bg-background border border-border dark:border-senior rounded-xl px-4 py-3">
              <Lock color={mutedIconColor} size={isSeniorMode ? 24 : 20} className="mr-3" />
              <TextInput
                className={`flex-1 ml-1 text-text font-sans ${isSeniorMode ? 'text-lg' : 'text-base'}`}
                placeholder="Repeat new password"
                placeholderTextColor={mutedIconColor}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
								onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 280, animated: true });
                  }, 100);
                }}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1 ml-2">
                {showConfirmPassword ? <EyeOff color={mutedIconColor} size={20} /> : <Eye color={mutedIconColor} size={20} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* ACCESSIBILITY */}
          <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>Accessibility</Text>
          <View className="bg-surface rounded-2xl p-5 mb-8 border border-border dark:border-senior dark:border-border shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 pr-4">
                <ShieldAlert color={primaryIconColor} size={isSeniorMode ? 32 : 28} className="mr-4" />
                <View className="flex-1 ml-2">
                  <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
                    Senior Mode
                  </Text>
                  <Text className={`text-text-muted font-sans mt-1 ${isSeniorMode ? 'text-base leading-6' : 'text-sm'}`}>
                    High contrast, larger text, and emergency tools.
                  </Text>
                </View>
              </View>
              <Switch
                value={seniorMode} 
                onValueChange={setSeniorMode}
                trackColor={{ false: Colors.light.border, true: isSeniorMode ? Colors.dark.primary : Colors.light.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* MOBILITY */}
          <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>Mobility & Reach</Text>
          <View className="bg-surface rounded-2xl p-5 mb-8 border border-border dark:border-senior dark:border-border shadow-sm">
            <Text className={`text-text-muted font-sans mb-5 ${isSeniorMode ? 'text-lg leading-6' : 'text-sm'}`}>
              How far can you travel to help neighbors?
            </Text>

            <View className={`flex-row gap-4 ${isSeniorMode ? 'flex-col' : ''}`}>
              <TouchableOpacity 
                onPress={() => setTransportMode('walking')}
                activeOpacity={0.7}
                className={`flex-1 flex-row items-center justify-center p-5 rounded-xl border-2 dark:rounded-senior dark:border-senior ${
                  transportMode === 'walking' ? 'bg-primary border-primary dark:bg-primary dark:border-primary' : 'bg-transparent border-border dark:border-border'
                }`}
              >
                <Footprints color={transportMode === 'walking' ? '#FFFFFF' : mutedIconColor} size={isSeniorMode ? 26 : 24} className="mr-3" />
                <View className='ml-2'>
                  <Text className={`font-sans font-bold ${transportMode === 'walking' ? 'text-on-primary dark:text-white' : 'text-text'} ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>Walking</Text>
                  <Text className={`font-sans ${transportMode === 'walking' ? 'text-on-primary opacity-80 dark:text-white' : 'text-text-muted'} ${isSeniorMode ? 'text-base' : 'text-base'}`}>7.5 km</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setTransportMode('driving')}
                activeOpacity={0.7}
                className={`flex-1 flex-row items-center justify-center p-5 rounded-xl border-2 dark:rounded-senior dark:border-senior ${
                  transportMode === 'driving' ? 'bg-primary border-primary dark:bg-primary dark:border-primary' : 'bg-transparent border-border dark:border-border'
                }`}
              >
                <Car color={transportMode === 'driving' ? '#FFFFFF' : mutedIconColor} size={isSeniorMode ? 26 : 24} className="mr-3" />
                <View className='ml-2'>
                  <Text className={`font-sans font-bold ${transportMode === 'driving' ? 'text-on-primary dark:text-white' : 'text-text'} ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>Driving</Text>
                  <Text className={`font-sans ${transportMode === 'driving' ? 'text-on-primary opacity-80 dark:text-white' : 'text-text-muted'} ${isSeniorMode ? 'text-base' : 'text-base'}`}>35.0 km</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* INTERESTS */}
          <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>Interests</Text>
          <View className="bg-surface rounded-2xl p-5 mb-8 border border-border dark:border-senior dark:border-border shadow-sm">
            <View className="flex-row items-center mb-4">
              <Tag color={primaryIconColor} size={isSeniorMode ? 24 : 20} className="mr-3" />
              <Text className={`text-text-muted ml-2 font-sans flex-1 ${isSeniorMode ? 'text-lg leading-6' : 'text-sm'}`}>
                Select what you care about to tailor your smart feed.
              </Text>
            </View>
            
            <View className="flex-row flex-wrap gap-3">
              {AVAILABLE_TAGS.map((tag) => {
                const isActive = userTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    activeOpacity={0.7}
                    onPress={() => handleToggleTag(tag)}
                    className={`px-4 py-2 rounded-full border-2 dark:rounded-senior dark:border-senior ${
                      isActive ? 'bg-primary border-primary dark:bg-primary dark:border-primary' : 'bg-transparent border-border dark:border-border'
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

        </ScrollView>

        {/* FLOATING SAVE BUTTON */}
        <View className="absolute bottom-0 w-full px-6 pb-8 pt-4 bg-background border-t border-border dark:border-senior dark:border-border">
          <TouchableOpacity 
            className="bg-primary dark:bg-primary py-4 rounded-xl dark:rounded-senior items-center flex-row justify-center shadow-sm active:opacity-80" 
            onPress={handleSaveChanges} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Save color="#FFFFFF" size={isSeniorMode ? 24 : 20} className="mr-2" />
                <Text className={`text-white ml-2 font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
                  Save Changes
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}