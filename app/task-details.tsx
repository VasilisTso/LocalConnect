import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { ArrowLeft, HeartHandshake, MapPin, Shield, ShieldAlert, Tag, User as UserIcon, Award, CheckCircle, XCircle, Lock } from 'lucide-react-native';
import * as Location from 'expo-location';

// badge helper for this screen
function getBadge(karma: number) {
  if (karma < 0) return { title: 'Flagged', color: '#EF4444', icon: ShieldAlert };
  if (karma < 50) return { title: 'New Neighbor', color: '#64748B', icon: UserIcon };
  if (karma < 150) return { title: 'Active Helper', color: '#5F4B8B', icon: Shield };
  return { title: 'Local Hero', color: '#D97706', icon: Award }; 
}

export default function TaskDetailsScreen() {
  const router = useRouter();
  const { session, isSeniorMode } = useAppStore();
  const [loading, setLoading] = useState(false);

  // State to hold the human-readable location name
  const [locationName, setLocationName] = useState<string>("Loading area...");

  // Grab all the task data passed from the Feed
  const params = useLocalSearchParams();
  const taskId = params.id as string;
  const title = params.title as string;
  const description = params.description as string;
  const category = params.category as string;
  const taskUserId = params.user_id as string;

  // URL params are strings, convert karma back to a number
  const creatorKarma = Number(params.creator_karma) || 0; 

  // Grab the coordinates passed from the feed
  const latitude = Number(params.latitude);
  const longitude = Number(params.longitude);

  // STATE MACHINE PARAMS
  const status = params.status as string;
  const helperId = params.helper_id as string;
  const privateContactInfo = params.private_contact_info as string;

  const isMyTask = session?.user?.id === taskUserId;
  const badge = getBadge(creatorKarma);

  // Translate the GPS into a safe, generic neighborhood name
  useEffect(() => {
    async function fetchLocationName() {
      if (!latitude || !longitude) {
        setLocationName("Local Area");
        return;
      }

      try {
        // This uses Apple/Google's free on-device geocoder
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        
        if (geocode && geocode.length > 0) {
          const place = geocode[0];
          // We intentionally grab generic fields like 'district' or 'city' to protect privacy, 
          // avoiding 'street' or 'name' (which could be a house number).
          const area = place.district || place.city || place.subregion || "Local Neighborhood";
          const widerArea = place.region || place.country || "";
          
          setLocationName(widerArea ? `${area}, ${widerArea}` : area);
        } else {
          setLocationName("Local Area");
        }
      } catch (error) {
        console.warn("Reverse geocode failed:", error);
        setLocationName("Local Area"); // Fallback if offline
      }
    }

    fetchLocationName();
  }, [latitude, longitude]);

  // ACTION 1: A Helper offers help (Changes status from open -> pending)
  async function handleOfferHelp() {
    Alert.alert(
      'Offer Help', 
      'This will notify the owner. If they accept, they will share their private contact info with you.', 
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Offer Help', 
          style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              // FIXED: We now use our secure RPC to bypass RLS safely!
              const { error } = await supabase.rpc('offer_help', {
                target_task_id: taskId,
                helper_uuid: session?.user?.id
              });

              if (error) throw error;
              Alert.alert('Offer Sent!', 'The owner has been notified. Check back later!');
              router.back(); 
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }

  // ACTION 2: The Owner accepts the helper (Changes status from pending -> in_progress)
  async function handleAcceptHelper() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', taskId);
      if (error) throw error;
      Alert.alert('Accepted!', 'The helper can now see your private contact info.');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  // ACTION 3: The Owner declines the helper (Resets status to open, clears helper_id)
  async function handleDeclineHelper() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'open', helper_id: null })
        .eq('id', taskId);
      if (error) throw error;
      Alert.alert('Declined', 'Task has been put back on the public feed.');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  // ACTION 4: The Helper marks the task as complete (Awards Karma!)
  async function handleMarkCompleted() {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('resolve_task', {
        target_task_id: taskId,
        helper_id: session?.user?.id
      });
      if (error) throw error;
      Alert.alert('Thank you!', 'You earned 10 Karma Points for helping your neighborhood.');
      router.back(); 
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-4 border-b border-surface-highlight">
        <TouchableOpacity onPress={() => router.back()} className="mr-2 p-2 -ml-2">
          <ArrowLeft color={isSeniorMode ? "#000000" : "#1F1C2C"} size={28} />
        </TouchableOpacity>
        <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
          Task Details
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
        {/* Title & Badge */}
        <Text className={`text-text font-sans font-bold mb-5 ${isSeniorMode ? 'text-4xl leading-10' : 'text-3xl'}`}>
          {title}
        </Text>

        <View className="flex-column items-start gap-3 mb-8">
          {/* Trust Badge */}
          <View 
            className="flex-row items-center px-3 py-1.5 rounded-full border"
            style={{ backgroundColor: `${badge.color}15`, borderColor: badge.color }}
          >
            {React.createElement(badge.icon, { color: badge.color, size: 16, className: "mr-2" })}
            <Text className={`font-sans ml-2 font-bold ${isSeniorMode ? 'text-base' : 'text-sm'}`} style={{ color: badge.color }}>
              Posted by {badge.title}
            </Text>
          </View>

          {/* Category Tag */}
          <View className="flex-row items-center bg-surface px-3 py-1.5 rounded-full border border-surface-highlight">
            <Tag color="#5F4B8B" size={16} className="mr-2" />
            <Text className={`text-text-muted ml-2 font-sans font-semibold ${isSeniorMode ? 'text-base' : 'text-sm'}`}>
              {category}
            </Text>
          </View>

          {/* Location Pin, Displays the formatted, privacy-preserving location */}
          <View className="flex-row items-center bg-surface px-3 py-1.5 rounded-full border border-surface-highlight">
            <MapPin color="#D97706" size={16} className="mr-2" />
            <Text className={`text-text-muted ml-2 font-sans font-semibold ${isSeniorMode ? 'text-base' : 'text-sm'}`}>
              {locationName}
            </Text>
          </View>
        </View>

        {/* Description Section */}
        <Text className={`text-text font-sans font-bold mb-2 ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
          Description
        </Text>
        <View className='bg-surface rounded-2xl p-4 mb-10 border border-surface-highlight'>
            <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-xl leading-8' : 'text-base leading-6'}`}>
            {description}
            </Text>
        </View>

        {/* SECURE HANDSHAKE: Only visible if task is in progress and you are involved! */}
        {status === 'in_progress' && (isMyTask || session?.user?.id === helperId) && privateContactInfo ? (
          <View className='bg-[#5F4B8B] rounded-2xl p-5 mb-8 border border-[#3B2F56] shadow-sm'>
            <View className="flex-row items-center mb-3">
              <Lock color="#FFFFFF" size={20} className="mr-2" />
              <Text className={`text-white ml-2 font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
                Private Instructions
              </Text>
            </View>
            <Text className={`text-[#F3F0FF] font-sans ${isSeniorMode ? 'text-xl leading-8' : 'text-base leading-6'}`}>
              {privateContactInfo}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* DYNAMIC ACTION BUTTONS (Floating at the bottom) */}
      <View className="absolute bottom-0 w-full px-6 pb-8 pt-4 border-t border-surface-highlight bg-background">
        
        {/* State 1: Open Task (Helper views it) */}
        {!isMyTask && status === 'open' && (
          <TouchableOpacity className="bg-secondary py-4 rounded-xl items-center flex-row justify-center shadow-sm" onPress={handleOfferHelp} disabled={loading}>
            {loading ? <ActivityIndicator color="#1F1C2C" /> : (
              <>
                <HeartHandshake color="#1F1C2C" size={24} className="mr-2" />
                <Text className={`text-text ml-2 font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>Offer Help</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* State 2: Pending Task (Owner views it to Accept/Decline) */}
        {isMyTask && status === 'pending' && (
          <View className="flex-row justify-between gap-4">
            <TouchableOpacity className="flex-1 bg-surface border border-surface-highlight py-4 rounded-xl items-center flex-row justify-center shadow-sm" onPress={handleDeclineHelper} disabled={loading}>
              <XCircle color="#EF4444" size={24} className="mr-2" />
              <Text className={`text-[#EF4444] ml-1 font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-1 bg-primary py-4 rounded-xl items-center flex-row justify-center shadow-sm" onPress={handleAcceptHelper} disabled={loading}>
              <CheckCircle color="#FFFFFF" size={24} className="mr-2" />
              <Text className={`text-white ml-1 font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State 3: In Progress (Helper views it to Complete) */}
        {!isMyTask && status === 'in_progress' && session?.user?.id === helperId && (
          <TouchableOpacity className="bg-primary py-4 rounded-xl items-center flex-row justify-center shadow-sm" onPress={handleMarkCompleted} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <CheckCircle color="#FFFFFF" size={24} className="mr-2" />
                <Text className={`text-white ml-2 font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>Mark Completed</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* State 4: Waiting / Already handled messages */}
        {!isMyTask && status === 'pending' && session?.user?.id === helperId && (
          <View className="bg-surface py-4 rounded-xl items-center shadow-sm border border-surface-highlight">
             <Text className="text-text-muted font-sans font-bold">Waiting for owner to accept...</Text>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}