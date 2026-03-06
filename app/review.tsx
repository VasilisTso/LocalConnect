import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { StatusBar } from 'expo-status-bar';
import { X, Star } from 'lucide-react-native';

import Colors from '@/constants/Colors';

export default function ReviewModal() {
  const router = useRouter();
  const { session, isSeniorMode } = useAppStore();
  
  // Grab the IDs passed from the Feed
  const { taskId, helperId, taskTitle } = useLocalSearchParams<{ 
    taskId: string, 
    helperId: string, 
    taskTitle: string 
  }>();

  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const activeStarColor = isSeniorMode ? Colors.dark.secondary : Colors.light.secondary;
  const inactiveStarColor = isSeniorMode ? Colors.dark.border : Colors.light.tabIconDefault;

  async function handleSubmitReview() {
    if (rating === 0) {
      Alert.alert('Missing Rating', 'Please select a star rating first.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        reviewer_id: session?.user?.id,
        reviewee_id: helperId,
        task_id: taskId,
        rating: rating
      });

      if (error) throw error;

      Alert.alert('Review Submitted!', 'Thank you for keeping our community safe and trustworthy.');
      router.back(); // Close modal
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-6 pt-10">
      <StatusBar style={isSeniorMode ? 'dark' : 'light'} />
      
      <View className="flex-row justify-between items-start mb-8 mt-6">
        <View className="flex-1 pr-4">
          <Text className={`font-sans font-bold text-text mb-2 ${isSeniorMode ? 'text-3xl' : 'text-3xl'}`}>
            Rate Helper
          </Text>
          <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
            How was your experience with "{taskTitle}"?
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="bg-surface border-2 border-border dark:border-senior dark:border-border p-3 rounded-full dark:rounded-senior"
        >
          <X color={isSeniorMode ? Colors.dark.text : Colors.light.text} size={isSeniorMode ? 28 : 24} />
        </TouchableOpacity>
      </View>

      {/* 5-Star Interactive Selector */}
      <View className="bg-surface border-2 border-border dark:border-senior dark:border-border rounded-2xl dark:rounded-senior p-8 items-center justify-center mb-10 shadow-sm dark:shadow-none">
        <View className="flex-row justify-between w-full px-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity 
              key={star} 
              onPress={() => setRating(star)}
              activeOpacity={0.7}
              className="p-1"
            >
              <Star 
                color={star <= rating ? activeStarColor : inactiveStarColor} 
                fill={star <= rating ? activeStarColor : "transparent"}
                size={isSeniorMode ? 48 : 44} 
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text className={`text-text font-sans font-bold mt-8 ${isSeniorMode ? 'text-xl' : 'text-xl'}`}>
          {rating === 0 ? 'Tap a star to rate' : `${rating} out of 5 Stars`}
        </Text>
      </View>

      <TouchableOpacity 
        className="bg-primary py-4 dark:py-5 rounded-xl dark:rounded-senior dark:border-senior dark:border-primary items-center flex-row justify-center active:opacity-80"
        onPress={handleSubmitReview}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className={`text-on-primary dark:text-white font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
            Submit Review
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}