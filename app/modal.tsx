/*

EDIT TASK MODAL

*/


import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';

const CATEGORIES = ['Pets', 'Education', 'Tools', 'Errands', 'Tech Support'];

export default function EditTaskModal() {
  const router = useRouter();
  // Grab the taskId that was passed from the Feed Screen
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const { session, isSeniorMode } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch the existing task data when the modal opens
  useEffect(() => {
    if (!taskId) return;

    async function fetchTask() {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (error) throw error;
        
        if (data) {
          setTitle(data.title);
          setDescription(data.description);
          setCategory(data.category);
        }
      } catch (error: any) {
        Alert.alert('Error', 'Could not load task details.');
        router.back(); // Close modal on error
      } finally {
        setLoading(false);
      }
    }

    fetchTask();
  }, [taskId]);

  // Save the updated data back to Supabase
  async function handleUpdateTask() {
    Keyboard.dismiss();

    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing Info', 'Please provide a title and description.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: title.trim(),
          description: description.trim(),
          category: category,
        })
        .eq('id', taskId)
        // RLS backup: strictly enforce that only the owner can edit this!
        .eq('user_id', session?.user?.id); 

      if (error) throw error;

      Alert.alert('Success!', 'Your task has been updated.');
      router.back(); // Close the modal and return to feed
      
    } catch (error: any) {
      Alert.alert('Error Updating Task', error.message);
    } finally {
      setSaving(false);
    }
  }

  // We don't use SafeAreaView here because it's a modal and we want it to map to the edges smoothly
  return (
    <View className="flex-1 bg-background">
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'dark'} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ padding: 25, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#5F4B8B" className="mt-10" />
          ) : (
            <>
              <View className="flex-row justify-between items-start mb-6 mt-10">
                <View className="flex-1 pr-4">
                  <Text className="text-3xl font-sans font-bold text-text mb-2">Edit Task</Text>
                  <Text className="text-text-muted font-sans text-base">
                    Update your neighborhood request.
                  </Text>
                </View>
                
                {/* The Close Button */}
                <TouchableOpacity 
                  onPress={() => router.back()}
                  className="bg-surface border border-surface-highlight p-2 rounded-full"
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <X color="#64748B" size={24} />
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <Text className="text-text font-sans text-sm mb-1 font-semibold">Title</Text>
                <TextInput
                  className="bg-surface border border-surface-highlight rounded-xl px-4 py-3 text-text font-sans text-base"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View className="mb-6">
                <Text className="text-text font-sans text-sm mb-1 font-semibold">Description</Text>
                <TextInput
                  className="bg-surface border border-surface-highlight rounded-xl px-4 py-3 text-text font-sans text-base min-h-[100px]"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View className="mb-10">
                <Text className="text-text font-sans text-sm mb-2 font-semibold">Category</Text>
                <View className="flex-row flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const isActive = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setCategory(cat)}
                        className={`px-4 py-2 rounded-full border ${
                          isActive 
                            ? 'bg-primary border-primary' 
                            : 'bg-surface border-surface-highlight'
                        }`}
                      >
                        <Text className={`font-sans font-semibold ${
                          isActive ? 'text-white' : 'text-text-muted'
                        }`}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity 
                className="bg-primary py-4 rounded-xl items-center flex-row justify-center"
                onPress={handleUpdateTask}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-sans text-lg font-bold">Save Changes</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}