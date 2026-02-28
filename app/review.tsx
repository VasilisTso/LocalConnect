import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { StatusBar } from 'expo-status-bar';
import { X, Star } from 'lucide-react-native';

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
      <StatusBar style="light" />
      
      <View className="flex-row justify-between items-start mb-8">
        <View className="flex-1 pr-4">
          <Text className={`font-sans font-bold text-text mb-2 ${isSeniorMode ? 'text-4xl' : 'text-3xl'}`}>
            Rate Helper
          </Text>
          <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
            How was your experience with "{taskTitle}"?
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => router.back()}
          className="bg-surface border border-surface-highlight p-2 rounded-full"
        >
          <X color="#64748B" size={isSeniorMode ? 32 : 24} />
        </TouchableOpacity>
      </View>

      {/* 5-Star Interactive Selector */}
      <View className="bg-surface border border-surface-highlight rounded-2xl p-8 items-center justify-center mb-10 shadow-sm">
        <View className="flex-row justify-between w-full px-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity 
              key={star} 
              onPress={() => setRating(star)}
              activeOpacity={0.7}
              className="p-1"
            >
              <Star 
                color={star <= rating ? "#FFD167" : "#E2E8F0"} 
                fill={star <= rating ? "#FFD167" : "transparent"} 
                size={isSeniorMode ? 56 : 48} 
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text className={`text-text font-sans font-bold mt-6 ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
          {rating === 0 ? 'Tap a star to rate' : `${rating} out of 5 Stars`}
        </Text>
      </View>

      <TouchableOpacity 
        className="bg-primary py-4 rounded-xl items-center flex-row justify-center"
        onPress={handleSubmitReview}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className={`text-white font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
            Submit Review
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}