import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

// We use the same categories as the profile tags to ensure the 
// Adaptivity Engine can easily match tasks to user interests.
const CATEGORIES = ['Pets', 'Education', 'Tools', 'Errands', 'Tech Support'];

// Privacy by Design: We use fuzzed "Neighborhood Centroids" instead of exact GPS.
// (Example coordinates focused around the general Attica/Melissia area)
const NEIGHBORHOODS = [
  { name: 'North Melissia', lon: 23.8350, lat: 38.0550 },
  { name: 'South Melissia', lon: 23.8300, lat: 38.0450 },
  { name: 'Central Square', lon: 23.8333, lat: 38.0500 },
];

/**
 * @description Create Task Screen
 * Human-Centric Goal: A distraction-free, highly legible form for users to request or offer help.
 * Adaptivity Connection: The selected `category` is the primary metadata used by the `fetch_adaptive_feed` 
 * to rank this task in other users' feeds.
 * Privacy Check: Enforces location fuzzing by using predefined neighborhood nodes instead of raw GPS.
 */
export default function AddTaskScreen() {
  const router = useRouter();
  const { session, isSeniorMode } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [neighborhood, setNeighborhood] = useState(NEIGHBORHOODS[2]); // Default to Central
  const [loading, setLoading] = useState(false);

  async function handleCreateTask() {
    Keyboard.dismiss();

    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing Info', 'Please provide a title and description.');
      return;
    }

    if (!session?.user?.id) {
      Alert.alert('Authentication Error', 'You must be logged in to create a task.');
      return;
    }

    setLoading(true);
    try {
      // Format the coordinate specifically for PostGIS GEOGRAPHY(POINT) insertion
      const locationString = `POINT(${neighborhood.lon} ${neighborhood.lat})`;

      const { error } = await supabase.from('tasks').insert([
        {
          user_id: session.user.id,
          title: title.trim(),
          description: description.trim(),
          category: category,
          location: locationString,
          status: 'open',
        }
      ]);

      if (error) throw error;

      Alert.alert('Success!', 'Your task has been posted to the neighborhood.');
      
      // Reset form
      setTitle('');
      setDescription('');
      
      // Route user back to the feed to see their new post
      router.replace('/(tabs)');
      
    } catch (error: any) {
      Alert.alert('Error Creating Task', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View className="mb-6">
            <Text className={`font-sans font-bold text-text mb-2 ${isSeniorMode ? 'text-4xl' : 'text-3xl'}`}>Create a Task</Text>
            <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
              Ask for help or offer your services to the neighborhood.
            </Text>
          </View>

          {/* Title Input */}
          <View className="mb-4">
            <Text className={`text-text font-sans font-semibold mb-1 ${isSeniorMode ? 'text-base' : 'text-sm'}`}>Title</Text>
            <TextInput
              className={`bg-surface border border-surface-highlight rounded-xl px-4 py-3 text-text font-sans ${isSeniorMode ? 'text-lg' : 'text-base'}`}
              placeholder="E.g., Need help moving a couch"
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description Input */}
          <View className="mb-6">
            <Text className={`text-text font-sans font-semibold mb-1 ${isSeniorMode ? 'text-base' : 'text-sm'}`}>Description</Text>
            <TextInput
              className={`bg-surface border border-surface-highlight rounded-xl px-4 py-3 text-text font-sans min-h-[100px] ${isSeniorMode ? 'text-lg' : 'text-base'}`}
              placeholder="Provide some details..."
              placeholderTextColor="#64748B"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Category Selector */}
          <View className="mb-6">
            <Text className={`text-text font-sans font-semibold mb-2 ${isSeniorMode ? 'text-base' : 'text-sm'}`}>Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isActive = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-full border ${isActive ? 'bg-primary border-primary' : 'bg-surface border-surface-highlight'}`}
                  >
                    <Text className={`font-sans font-semibold ${isActive ? 'text-white' : 'text-text-muted'} ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Neighborhood Selector */}
          <View className="mb-8">
            <Text className={`text-text font-sans font-semibold mb-2 ${isSeniorMode ? 'text-base' : 'text-sm'}`}>General Location (Kept private)</Text>
            <View className="flex-row flex-wrap gap-2">
              {NEIGHBORHOODS.map((hood) => {
                const isActive = neighborhood.name === hood.name;
                return (
                  <TouchableOpacity
                    key={hood.name}
                    onPress={() => setNeighborhood(hood)}
                    className={`px-4 py-2 rounded-lg border ${isActive ? 'bg-secondary border-secondary' : 'bg-surface border-surface-highlight'}`}
                  >
                    <Text className={`font-sans font-semibold ${isActive ? 'text-text' : 'text-text-muted'} ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
                      {hood.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity className="bg-primary py-4 rounded-xl items-center flex-row justify-center" onPress={handleCreateTask} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text className={`text-white font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>Post Task</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}