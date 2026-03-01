import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { ArrowLeft, HeartHandshake, MapPin, Shield, ShieldAlert, Tag, User as UserIcon, Award } from 'lucide-react-native';

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

  // Grab all the task data passed from the Feed
  const params = useLocalSearchParams();
  const taskId = params.id as string;
  const title = params.title as string;
  const description = params.description as string;
  const category = params.category as string;
  const taskUserId = params.user_id as string;
  // URL params are strings, convert karma back to a number
  const creatorKarma = Number(params.creator_karma) || 0; 

  const isMyTask = session?.user?.id === taskUserId;
  const badge = getBadge(creatorKarma);

  async function handleHelpOut() {
    Alert.alert(
      'Offer Help', 
      'Are you sure you want to complete this task? You will earn 10 Karma Points!', 
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'I Helped!', 
          style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase.rpc('resolve_task', {
                target_task_id: taskId,
                helper_id: session?.user?.id
              });

              if (error) throw error;

              Alert.alert('Thank you!', 'You earned 10 Karma Points for helping your neighborhood.');
              router.back(); // Send them back to the feed (which will auto-refresh!)
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

          {/* Location Pin */}
          <View className="flex-row items-center bg-surface px-3 py-1.5 rounded-full border border-surface-highlight">
            <MapPin color="#D97706" size={16} className="mr-2" />
            <Text className={`text-text-muted ml-2 font-sans font-semibold ${isSeniorMode ? 'text-base' : 'text-sm'}`}>
              Anonymized Node
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
      </ScrollView>

      {/* Floating Action Button for Help */}
      {!isMyTask && (
        <View className="px-6 pb-8 pt-4 border-t border-surface-highlight bg-background">
          <TouchableOpacity 
            className="bg-secondary py-4 rounded-xl items-center flex-row justify-center shadow-sm"
            onPress={handleHelpOut}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#1F1C2C" />
            ) : (
              <>
                <HeartHandshake color="#1F1C2C" size={24} className="mr-2" />
                <Text className={`text-text ml-2 font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
                  Offer Help
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}