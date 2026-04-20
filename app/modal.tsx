/*

EDIT TASK MODAL

*/


import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
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
import { X, Lock, CalendarClock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import Colors from '@/constants/Colors';

const CATEGORIES = [
  "Pets", "Education", "Tools", "Errands", "Tech", 
  "Cars", "Music", "Entertainment", "Home & Garden", "Fitness"
];

export default function EditTaskModal() {
  const router = useRouter();
  // Grab the taskId that was passed from the Feed Screen
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const { session, isSeniorMode, showAlert } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [privateInfo, setPrivateInfo] = useState('');

  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateMode, setDateMode] = useState<'date' | 'time' | 'datetime'>('date');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
  const mutedIconColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

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
          setPrivateInfo(data.private_contact_info || '');
        
          // Parse the existing due date if it exists
          if (data.due_date) {
            setDueDate(new Date(data.due_date));
          }
        }
      } catch (error: any) {
        showAlert('Error', 'Could not load task details.');
        router.back(); // Close modal on error
      } finally {
        setLoading(false);
      }
    }

    fetchTask();
  }, [taskId]);

  // Handle Date/Time Picker Logic
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'dismissed') {
      return;
    }

    if (selectedDate) {
      setDueDate(selectedDate);
      
      if (Platform.OS === 'android' && dateMode === 'date') {
        setDateMode('time');
        setShowDatePicker(true);
      }
    }
  };

  const openPicker = () => {
    setDateMode(Platform.OS === 'ios' ? 'datetime' : 'date');
    setShowDatePicker(true);
  };

  // Save the updated data back to Supabase
  async function handleUpdateTask() {
    Keyboard.dismiss();

    if (!title.trim() || !description.trim()) {
      showAlert('Missing Info', 'Please provide a title and description.');
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
          private_contact_info: privateInfo.trim(),
          due_date: dueDate ? dueDate.toISOString() : null,
        })
        .eq('id', taskId)
        // RLS backup: strictly enforce that only the owner can edit this!
        .eq('user_id', session?.user?.id); 

      if (error) throw error;

      showAlert('Success!', 'Your task has been updated.');
      router.back(); // Close the modal and return to feed
      
    } catch (error: any) {
      showAlert('Error Updating Task', error.message);
    } finally {
      setSaving(false);
    }
  }

  // We don't use SafeAreaView here because it's a modal and we want it to map to the edges smoothly
  return (
    <View className="flex-1 bg-background">
      <StatusBar style={isSeniorMode ? 'dark' : 'light'} />
      
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
            <ActivityIndicator size="large" color={primaryIconColor} className="mt-10" />
          ) : (
            <>
              <View className="flex-row justify-between items-start mb-6 mt-10">
                <View className="flex-1 pr-4">
                  <Text className={`font-sans font-bold text-text mb-2 ${isSeniorMode ? 'text-3xl' : 'text-3xl'}`}>
                    Edit Task
                  </Text>
                  <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
                    Update your neighborhood request.
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => router.back()} 
                  className="bg-surface border-2 border-border dark:border-senior dark:border-border p-3 rounded-full dark:rounded-senior active:opacity-70"
                >
                  <X color={isSeniorMode ? Colors.dark.text : Colors.light.text} size={isSeniorMode ? 28 : 24} />
                </TouchableOpacity>
              </View>

              <View className="mb-5">
                <Text className={`text-text font-sans font-semibold mb-2 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>Title</Text>
                <TextInput
                  className={`bg-background border-2 border-border dark:border-senior dark:border-border rounded-xl dark:rounded-senior px-4 py-3 text-text font-sans ${isSeniorMode ? 'text-lg' : 'text-base'}`}
                  value={title}
                  onChangeText={setTitle}
                  placeholderTextColor={mutedIconColor}
                />
              </View>

              <View className="mb-6">
                <Text className={`text-text font-sans font-semibold mb-2 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>Description</Text>
                <TextInput
                  className={`bg-background border-2 border-border dark:border-senior dark:border-border rounded-xl dark:rounded-senior px-4 py-3 text-text font-sans min-h-[100px] ${isSeniorMode ? 'text-lg' : 'text-base'}`}
                  value={description}
                  onChangeText={setDescription}
                  multiline textAlignVertical="top"
                  placeholderTextColor={mutedIconColor}
                />
              </View>

              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className={`text-text font-sans font-semibold ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>Due Date & Time (Optional)</Text>
                  {dueDate && (
                    <TouchableOpacity onPress={() => setDueDate(null)}>
                      <Text className="text-error font-sans font-bold text-sm">Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <TouchableOpacity 
                  onPress={openPicker}
                  className={`bg-background border-2 border-border dark:border-senior dark:border-border rounded-xl dark:rounded-senior px-4 py-3 flex-row items-center`}
                >
                  <CalendarClock color={primaryIconColor} size={isSeniorMode ? 24 : 20} className="mr-3" />
                  <Text className={`text-text font-sans ml-2 flex-1 ${dueDate ? '' : 'opacity-50'} ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
                    {dueDate ? dueDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Set a deadline..."}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={dueDate || new Date()}
                    mode={dateMode as any}
                    display="default"
                    onChange={onDateChange}
                    minimumDate={new Date()} // Prevent picking dates in the past
                  />
                )}
              </View>

              <View className="mb-8">
                <View className="flex-row items-center mb-2">
                  <Lock color={primaryIconColor} size={isSeniorMode ? 24 : 20} className="mr-2" />
                  <Text className={`text-text ml-2 font-sans font-semibold ${isSeniorMode ? 'text-xl' : 'text-base'}`}>Secure Handshake (Private)</Text>
                </View>
                <TextInput
                  className={`bg-background border-2 border-border dark:border-senior dark:border-border rounded-xl dark:rounded-senior px-4 py-3 text-text font-sans min-h-[80px] ${isSeniorMode ? 'text-lg' : 'text-base'}`}
                  value={privateInfo}
                  onChangeText={setPrivateInfo}
                  placeholder="Address, intercom, phone number..."
                  placeholderTextColor={mutedIconColor}
                  multiline textAlignVertical="top"
                />
              </View>

              <View className="mb-10">
                <Text className={`text-text font-sans font-semibold mb-3 ${isSeniorMode ? 'text-xl' : 'text-base'}`}>Category</Text>
                <View className="flex-row flex-wrap gap-3">
                  {CATEGORIES.map((cat) => {
                    const isActive = category === cat;
                    return (
                      <TouchableOpacity 
                        key={cat} 
                        onPress={() => setCategory(cat)} 
                        activeOpacity={0.7}
                        className={`px-4 py-2 rounded-full border-2 dark:rounded-senior dark:border-senior ${
                          isActive 
                            ? 'bg-primary border-primary dark:bg-primary dark:border-primary' 
                            : 'bg-transparent border-border dark:border-border'
                        }`}
                      >
                        <Text className={`font-sans font-semibold ${
                          isActive ? 'text-white dark:text-white' : 'text-text'
                        } ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity 
                className="bg-primary py-4 dark:py-6 rounded-xl dark:rounded-md dark:border-senior dark:border-black items-center flex-row justify-center active:opacity-80" 
                onPress={handleUpdateTask} 
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className={`text-on-primary dark:text-white font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}