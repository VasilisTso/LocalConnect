import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { ArrowLeft, HeartHandshake, MapPin, Shield, ShieldAlert, Tag, User as UserIcon, Award, CheckCircle, XCircle, Lock, Star, Flag, Clock, CalendarClock } from 'lucide-react-native';
import * as Location from 'expo-location';

import Colors from '@/constants/Colors';

// badge helper for this screen
function getBadge(karma: number) {
  if (karma < 0) return { title: 'Flagged', color: Colors.light.error, icon: ShieldAlert };
  if (karma < 50) return { title: 'New Neighbor', color: Colors.light.tabIconDefault, icon: UserIcon };
  if (karma < 150) return { title: 'Active Helper', color: Colors.light.primary, icon: Shield };
  return { title: 'Local Hero', color: Colors.light.secondary, icon: Award }; 
}

// Helper function to calculate Time Ago for 'created_at'
function timeAgo(dateString: string) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return `Yesterday`;
  return `${days}d ago`;
}

// Helper function to beautifully format the Due Date
function formatDueDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TaskDetailsScreen() {
  const router = useRouter();
  const { session, isSeniorMode, showAlert } = useAppStore();
  const [loading, setLoading] = useState(false);

  // State to hold the human-readable location name
  const [locationName, setLocationName] = useState<string>("Loading area...");

  // State to hold the helper's trust metrics
  const [helperProfile, setHelperProfile] = useState<{ avatar_url: string | null, karma_points: number, avg_rating: number, username: string | null } | null>(null);

  // Grab all the task data passed from the Feed
  const params = useLocalSearchParams();
  const taskId = params.id as string;
  const title = params.title as string;
  const description = params.description as string;
  const category = params.category as string;
  const taskUserId = params.user_id as string;

  // Grab the timestamps passed from the feed
  const createdAt = params.created_at as string;
  const dueDate = params.due_date as string;

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

  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
  const errorIconColor = isSeniorMode ? Colors.dark.error : Colors.light.error;
  const mutedIconColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

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

  // Fetch Helper Profile (Only if you are the owner and it is pending)
  useEffect(() => {
    async function fetchHelperProfile() {
      if (isMyTask && status === 'pending' && helperId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url, karma_points, avg_rating, username')
          .eq('id', helperId)
          .single();
          
        if (data && !error) {
          setHelperProfile(data);
        }
      }
    }
    fetchHelperProfile();
  }, [isMyTask, status, helperId]);

  // ACTION 1: A Helper offers help (Changes status from open -> pending)
  async function handleOfferHelp() {
    showAlert(
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
              // We now use our secure RPC to bypass RLS safely!
              const { error } = await supabase.rpc('offer_help', {
                target_task_id: taskId,
                helper_uuid: session?.user?.id
              });

              if (error) throw error;
              showAlert('Offer Sent!', 'The owner has been notified. Check back later!');
              router.back(); 
            } catch (error: any) {
              showAlert('Error', error.message);
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
      showAlert('Accepted!', 'The helper can now see your private contact info.');
      router.back();
    } catch (error: any) {
      showAlert('Error', error.message);
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
      showAlert('Declined', 'Task has been put back on the public feed.');
      router.back();
    } catch (error: any) {
      showAlert('Error', error.message);
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
      showAlert('Thank you!', 'You earned 10 Karma Points for helping your neighborhood.');
      router.back(); 
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  // for the report system of a task
  async function handleReportTask() {
    showAlert(
      'Report Task',
      'Does this task contain spam, inappropriate content, or violate community guidelines?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase.from('reports').insert({
                reporter_id: session?.user?.id,
                task_id: taskId
              });

              // If it's a unique constraint error, it means they already reported it
              if (error && error.code === '23505') {
                showAlert('Already Reported', 'You have already flagged this task for admin review.');
              } else if (error) {
                throw error;
              } else {
                showAlert('Report Sent', 'Thank you for keeping the neighborhood safe. An admin will review this shortly.');
              }
            } catch (error: any) {
              showAlert('Error', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-4 border-b border-border dark:border-senior dark:border-border">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-2 p-2 -ml-2 active:opacity-70">
            <ArrowLeft color={isSeniorMode ? Colors.dark.text : Colors.light.text} size={isSeniorMode ? 32 : 28} />
          </TouchableOpacity>
          <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
            Task Details
          </Text>
        </View>

        {!isMyTask && (
          <TouchableOpacity onPress={handleReportTask} className="p-2 -mr-2 flex-row items-center active:opacity-70">
            <Flag color={errorIconColor} size={isSeniorMode ? 24 : 24} />
            {isSeniorMode && (
              <Text className="text-error dark:text-error font-sans font-bold ml-2 text-lg">
                Report
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
        {/* Title and Time Posted */}
        <View className="flex-row justify-between items-start mb-6">
          <Text className={`flex-1 text-text font-sans font-bold mr-4 ${isSeniorMode ? 'text-3xl leading-9' : 'text-3xl'}`}>
            {title}
          </Text>
          
          {/* Time Posted Chip moved up here */}
          {createdAt && (
            <View className="flex-row items-center bg-background px-3 py-1.5 rounded-full mt-1">
              <Clock color={mutedIconColor} size={isSeniorMode ? 16 : 14} className="mr-1.5" />
              <Text className={`text-text-muted ml-2 font-sans font-semibold ${isSeniorMode ? 'text-sm' : 'text-xs'}`}>
                {timeAgo(createdAt)}
              </Text>
            </View>
          )}
        </View>

        {/* Metadata Chips */}
        <View className="flex-col items-start gap-3 mb-8 w-full">
          
          {/* Trust Badge */}
          <View 
            className="flex-row items-center px-4 py-2 rounded-full border bg-background"
            style={{ borderColor: badge.color }}
          >
            {React.createElement(badge.icon, { color: badge.color, size: isSeniorMode ? 20 : 16, className: "mr-2" })}
            <Text className={`font-sans ml-2 font-bold ${isSeniorMode ? 'text-base' : 'text-sm'}`} style={{ color: badge.color }}>
              By {badge.title}
            </Text>
          </View>

          {/* Category Tag */}
          <View className="flex-row items-center bg-surface px-4 py-2 rounded-full border border-border dark:border-senior dark:border-border">
            <Tag color={primaryIconColor} size={isSeniorMode ? 20 : 16} className="mr-2" />
            <Text className={`text-text-muted ml-2 font-sans font-semibold ${isSeniorMode ? 'text-base' : 'text-sm'}`}>
              {category}
            </Text>
          </View>

          {/* Location Pin */}
          <View className="flex-row items-center bg-surface px-4 py-2 rounded-full border border-border dark:border-senior dark:border-border">
            <MapPin color={isSeniorMode ? Colors.dark.secondary : Colors.light.secondary} size={isSeniorMode ? 20 : 16} className="mr-2" />
            <Text className={`text-text-muted ml-2 font-sans font-semibold ${isSeniorMode ? 'text-base' : 'text-sm'}`}>
              {locationName}
            </Text>
          </View>

          {/* Due Date Chip (Only shows if they selected a due date) */}
          {dueDate && (
            <View className="flex-row items-center justify-center w-full bg-background px-4 py-3 rounded-xl border border-secondary mt-2">
              <CalendarClock color={Colors.light.secondary} size={isSeniorMode ? 24 : 20} className="mr-3" />
              <Text className={`text-text ml-2 font-sans font-bold ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
                Needed by: {formatDueDate(dueDate)}
              </Text>
            </View>
          )}

        </View>

        {/* Description Section */}
        <Text className={`text-text font-sans font-bold mb-3 ${isSeniorMode ? 'text-xl' : 'text-xl'}`}>
          Description
        </Text>
        <View className='bg-surface rounded-2xl dark:rounded-senior p-5 mb-10 border border-border dark:border-senior dark:border-border'>
            <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-lg leading-7' : 'text-base leading-6'}`}>
            {description}
            </Text>
        </View>

        {/* SECURE HANDSHAKE: Only visible if task is in progress and you are involved */}
        {status === 'in_progress' && (isMyTask || session?.user?.id === helperId) && privateContactInfo ? (
          <View className='bg-primary dark:bg-primary rounded-2xl dark:rounded-senior p-6 mb-8 border border-border dark:border-senior dark:border-primary shadow-sm'>
            <View className="flex-row items-center mb-4">
              <Lock color="#FFFFFF" size={isSeniorMode ? 28 : 20} className="mr-3" />
              <Text className={`text-on-primary ml-2 dark:text-white font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-xl'}`}>
                Private Instructions
              </Text>
            </View>
            <Text className={`text-on-primary dark:text-white opacity-90 font-sans ${isSeniorMode ? 'text-lg leading-7' : 'text-base leading-6'}`}>
              {privateContactInfo}
            </Text>
          </View>
        ) : null}

        {/* HELPER TRUST CARD (Only visible to the owner when deciding to accept/decline) */}
        {isMyTask && status === 'pending' && helperProfile && (
          <View className="bg-surface rounded-2xl dark:rounded-senior p-6 mb-8 border-2 border-secondary dark:border-secondary shadow-sm">
            <Text className={`text-text font-sans font-bold mb-5 ${isSeniorMode ? 'text-xl' : 'text-xl'}`}>
              {helperProfile.username ? `${helperProfile.username} wants to help!` : 'A neighbor wants to help!'}
            </Text>
            
            <View className="flex-row items-center">
              {helperProfile.avatar_url ? (
                <Image 
                  source={{ uri: helperProfile.avatar_url }} 
                  style={{ width: 64, height: 64, borderRadius: 32, marginRight: 16 }} 
                />
              ) : (
                <View className="bg-surface border-2 border-border p-4 rounded-full mr-4" style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
                  <UserIcon color={primaryIconColor} size={isSeniorMode ? 32 : 32} />
                </View>
              )}
              
              <View className="flex-1">
                <View className="flex-row items-center mb-3">
                  <View 
                    className="flex-row items-center px-4 py-1.5 rounded-full border bg-background"
                    style={{ borderColor: getBadge(helperProfile.karma_points).color }}
                  >
                    {React.createElement(getBadge(helperProfile.karma_points).icon, { color: getBadge(helperProfile.karma_points).color, size: isSeniorMode ? 16 : 14, className: "mr-2" })}
                    <Text className={`font-sans ml-2 font-bold ${isSeniorMode ? 'text-sm' : 'text-xs'}`} style={{ color: getBadge(helperProfile.karma_points).color }}>
                      {getBadge(helperProfile.karma_points).title}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Star color={isSeniorMode ? Colors.dark.secondary : Colors.light.secondary} fill={isSeniorMode ? Colors.dark.secondary : Colors.light.secondary} size={isSeniorMode ? 20 : 16} className="mr-2" />
                  <Text className={`text-text ml-2 font-sans font-bold ${isSeniorMode ? 'text-base' : 'text-base'}`}>
                    {helperProfile.avg_rating > 0 ? helperProfile.avg_rating.toFixed(1) : "No ratings yet"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* DYNAMIC ACTION BUTTONS (Floating at the bottom) */}
      <View className="absolute bottom-0 w-full px-6 pb-8 pt-4 border-t border-border dark:border-senior dark:border-border bg-background">
        
        {/* State 1: Open Task (Helper views it) */}
        {!isMyTask && status === 'open' && (
          <TouchableOpacity 
            className="bg-secondary py-4 dark:py-5 rounded-xl dark:rounded-senior dark:border-senior dark:border-secondary items-center flex-row justify-center active:opacity-80 shadow-sm" 
            onPress={handleOfferHelp} 
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={isSeniorMode ? "#FFFFFF" : "#1A1826"} /> : (
              <>
                <HeartHandshake color={isSeniorMode ? "#FFFFFF" : "#1A1826"} size={isSeniorMode ? 28 : 24} className="mr-3" />
                <Text className={`text-on-secondary ml-2 dark:text-white font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-xl'}`}>Offer Help</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* State 2: Pending Task (Owner views it to Accept/Decline) */}
        {isMyTask && status === 'pending' && (
          <View className="flex-row justify-between gap-4">
            <TouchableOpacity
              className="flex-1 bg-surface border-2 border-border dark:border-senior dark:border-error py-4 rounded-xl dark:rounded-senior items-center flex-row justify-center shadow-sm active:opacity-70" 
              onPress={handleDeclineHelper} 
              disabled={loading}
            >
              <XCircle color={errorIconColor} size={isSeniorMode ? 24 : 24} className="mr-2" />
              <Text className={`text-error ml-2 dark:text-error font-sans font-bold ${isSeniorMode ? 'text-lg' : 'text-lg'}`}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-1 bg-primary dark:bg-primary py-4 rounded-xl dark:rounded-senior dark:border-senior dark:border-primary items-center flex-row justify-center shadow-sm active:opacity-80" 
              onPress={handleAcceptHelper} 
              disabled={loading}
            >
              <CheckCircle color="#FFFFFF" size={isSeniorMode ? 24 : 24} className="mr-2" />
              <Text className={`text-white ml-2 font-sans font-bold ${isSeniorMode ? 'text-lg' : 'text-lg'}`}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State 3: In Progress (Helper views it to Complete) */}
        {!isMyTask && status === 'in_progress' && session?.user?.id === helperId && (
          <TouchableOpacity 
            className="bg-primary dark:bg-primary py-4 dark:py-5 rounded-xl dark:rounded-senior dark:border-senior dark:border-primary items-center flex-row justify-center shadow-sm active:opacity-80" 
            onPress={handleMarkCompleted} 
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <CheckCircle color="#FFFFFF" size={isSeniorMode ? 28 : 24} className="mr-3" />
                <Text className={`text-white ml-2 font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-xl'}`}>Mark Completed</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* State 4: Waiting / Already handled messages */}
        {!isMyTask && status === 'pending' && session?.user?.id === helperId && (
          <View className="bg-surface py-5 rounded-xl dark:rounded-senior items-center shadow-sm border-2 border-border dark:border-senior dark:border-border">
             <Text className={`text-text-muted font-sans font-bold ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
               Waiting for owner to accept...
             </Text>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}