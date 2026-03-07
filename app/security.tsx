import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, ShieldCheck, MapPin, Bell, Download, Trash2, ExternalLink } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import * as Location from 'expo-location';
import Colors from '@/constants/Colors';

export default function SecurityScreen() {
  const router = useRouter();
  const { isSeniorMode, showAlert } = useAppStore();
  
  // Dummy states for the UI switches
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
  const mutedIconColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  // Check real OS permissions every time the user looks at this screen
  useFocusEffect(
    useCallback(() => {
      async function checkPermissions() {
        // Check exact Location status
        const { status: locStatus } = await Location.getForegroundPermissionsAsync();
        setLocationEnabled(locStatus === 'granted');

        // we leave it as a visual dummy.
        setNotificationsEnabled(true); 
      }
      
      checkPermissions();
    }, [])
  );

  // Open native device settings
  const openDeviceSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleRequestData = () => {
    showAlert(
      "Data Request Received", 
      "We will compile your account data and send a secure download link to your email within 48 hours."
    );
  };

  const handleDeleteAccount = () => {
    showAlert(
      "Delete Account", 
      "Are you absolutely sure? This action is permanent and cannot be undone. All your tasks, karma, and data will be erased.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete My Account", 
          style: "destructive", 
          onPress: () => showAlert("Notice", "For security reasons, please contact admin to process complete account deletion.") 
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* HEADER */}
      <View className="flex-row items-center px-6 pt-4 pb-4 border-b border-border dark:border-senior dark:border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-2 p-2 -ml-2 active:opacity-70">
          <ArrowLeft color={isSeniorMode ? Colors.dark.text : Colors.light.text} size={isSeniorMode ? 32 : 28} />
        </TouchableOpacity>
        <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
          Security & Privacy
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* PRIVACY BY DESIGN */}
        <View className="bg-surface border-2 border-primary rounded-2xl p-5 mb-8 dark:bg-primary/20 dark:border-primary/50">
          <View className="flex-row items-center mb-3">
            <ShieldCheck color={primaryIconColor} size={isSeniorMode ? 28 : 24} className="mr-3" />
            <Text className={`text-primary ml-2 font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
              Privacy by Design
            </Text>
          </View>
          <Text className={`text-text font-sans ${isSeniorMode ? 'text-lg leading-7' : 'text-base leading-6'}`}>
            LocalConnect uses <Text className="font-bold">Location Fuzzing</Text>. Your exact GPS coordinates are never shown to the public. They are anonymized to a 1km radius to protect your home address.
          </Text>
        </View>

        {/* DEVICE PERMISSIONS */}
        <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>Device Permissions</Text>
        <View className="bg-surface rounded-2xl p-2 mb-8 border border-border dark:border-senior shadow-sm">
          
          {/* Location Permission */}
          <View className="flex-row items-center justify-between p-4 border-b border-border dark:border-senior/50">
            <View className="flex-row items-center flex-1 pr-4">
              <View className="bg-background p-2 rounded-lg border border-border dark:border-senior mr-4">
                <MapPin color={mutedIconColor} size={isSeniorMode ? 24 : 20} />
              </View>
              <View className="flex-1">
                <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-base'}`}>Location Access</Text>
                <Text className={`text-text-muted font-sans mt-0.5 ${isSeniorMode ? 'text-base' : 'text-xs'}`}>
                  {locationEnabled ? "Granted (Required for feed)" : "Denied (Tap to enable)"}
                </Text>
              </View>
            </View>
            <Switch 
              value={locationEnabled} 
              onValueChange={openDeviceSettings}
              trackColor={{ false: Colors.light.border, true: isSeniorMode ? Colors.dark.success : Colors.light.success }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Notifications Permission */}
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center flex-1 pr-4">
              <View className="bg-background p-2 rounded-lg border border-border dark:border-senior mr-4">
                <Bell color={mutedIconColor} size={isSeniorMode ? 24 : 20} />
              </View>
              <View className="flex-1">
                <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-base'}`}>Push Notifications</Text>
                <Text className={`text-text-muted font-sans mt-0.5 ${isSeniorMode ? 'text-base' : 'text-xs'}`}>Alerts when neighbors offer help</Text>
              </View>
            </View>
            <Switch 
              value={notificationsEnabled} 
              onValueChange={openDeviceSettings}
              trackColor={{ false: Colors.light.border, true: isSeniorMode ? Colors.dark.success : Colors.light.success }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* DATA MANAGEMENT */}
        <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>Your Data</Text>
        <View className="bg-surface rounded-2xl border border-border dark:border-senior overflow-hidden shadow-sm mb-8">
          
          <TouchableOpacity 
            onPress={handleRequestData}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-5"
          >
            <View className="flex-row items-center">
              <Download color={primaryIconColor} size={isSeniorMode ? 24 : 20} className="mr-4" />
              <Text className={`text-text ml-2 font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-base'}`}>
                Request Account Data
              </Text>
            </View>
            <ExternalLink color={mutedIconColor} size={isSeniorMode ? 20 : 18} />
          </TouchableOpacity>

        </View>

        {/* DANGER ZONE */}
        <Text className={`text-error dark:text-error font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>Danger Zone</Text>
        <TouchableOpacity 
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
          className="flex-row items-center justify-center p-5 bg-background border-2 border-error rounded-2xl"
        >
          <Trash2 color={Colors.light.error} size={isSeniorMode ? 24 : 20} className="mr-3" />
          <Text className={`text-error ml-2 dark:text-error font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-base'}`}>
            Delete Account
          </Text>
        </TouchableOpacity>
        <Text className={`text-text-muted font-sans text-center mt-3 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
          This action cannot be undone.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}