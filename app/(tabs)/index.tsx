import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Tag, Trash2, ChevronRight, Edit2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'expo-router';

// Define the shape of Task data
interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  // Note: PostGIS location comes back as a WKB/GeoJSON or string depending on the query, 
  // but for the UI list, we primarily rely on the category and title.
}

/**
 * @description The Smart Feed (Main Screen)
 * Human-Centric Goal: Presents tasks clearly. In Senior Mode (Dark Mode), the CSS variables 
 * automatically shift to high-contrast backgrounds and text.
 * Adaptivity Connection: Implements "Implicit Feedback". Clicking a task logs a 'viewed' 
 * interaction to the database, which trains the adaptivity engine on what the user cares about.
 */
export default function FeedScreen() {
  const router = useRouter();
  const { session, isSeniorMode } = useAppStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch the tasks
  const fetchTasks = useCallback(async () => {
    try {
      // standard fetch sorted by newest.

      // TODO 

      // Once you have more data, swap this to use `fetch_adaptive_feed` RPC!
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      Alert.alert('Error fetching tasks', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  // IMPLICIT FEEDBACK: Learning mechanism
  async function handleViewTask(task: Task) {
    if (!session?.user?.id) return;

    try {
      // Silently log the interaction in the background
      await supabase.from('user_interactions').insert([{
        user_id: session.user.id,
        task_id: task.id,
        interaction_type: 'viewed_category_' + task.category // e.g., viewed_category_Pets
      }]);
      
      // In full app, route to a Details screen. 
      // For now, show an alert to prove the interaction was logged
      Alert.alert(
        task.title, 
        `${task.description}\n\n(Implicit Feedback: 'Viewed ${task.category}' logged for Adaptivity Engine)`
      );
    } catch (error) {
      console.error("Failed to log interaction silently", error);
    }
  }

  // Remove a task
  async function handleDeleteTask(taskId: string) {
    Alert.alert('Delete Task', 'Are you sure you want to remove this request?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            // RLS protects this: the database will ONLY delete it if auth.uid() === task.user_id
            const { error } = await supabase
              .from('tasks')
              .delete()
              .eq('id', taskId);

            if (error) throw error;
            
            // Remove from local state to update UI instantly
            setTasks(prev => prev.filter(t => t.id !== taskId));
          } catch (error: any) {
            Alert.alert('Error deleting task', error.message);
          }
        }
      }
    ]);
  }

  // UI Component for individual task cards
  const renderTask = ({ item }: { item: Task }) => {
    const isMyTask = session?.user?.id === item.user_id;

    return (
      <TouchableOpacity 
        className="bg-surface rounded-2xl p-4 mb-4 border border-surface-highlight shadow-sm"
        onPress={() => handleViewTask(item)}
        activeOpacity={0.7}
      >
        <View className="flex-row justify-between items-start mb-5">
          <Text className="text-text font-sans font-bold text-lg flex-1 mr-2" numberOfLines={2}>
            {item.title}
          </Text>
          {/* Only show delete button if the logged-in user owns this task */}
          {isMyTask && (
            <View className="flex-row items-center -mr-2 -mt-2">
              <TouchableOpacity 
                // Pass the taskId as a URL parameter to the modal to edit
                onPress={() => router.push({ pathname: '/modal', params: { taskId: item.id } })} 
                className="p-2 mr-2"
              >
                <Edit2 color="#5f4b8b" size={20} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteTask(item.id)} className="p-2">
                <Trash2 color="#EF4444" size={20} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text className="text-text-muted font-sans text-sm mb-5" numberOfLines={4}>
          {item.description}
        </Text>

        <View className="flex-row items-center justify-between mt-auto">
          <View className="flex-row items-center bg-background px-3 py-1.5 rounded-full border border-surface-highlight">
            <Tag color="#5F4B8B" size={14} className="mr-3" />
            <Text className="text-text-muted ml-2 font-sans text-xs font-semibold">{item.category}</Text>
          </View>
          
          <View className="flex-row items-center">
            <Text className="text-primary font-sans text-sm font-bold mr-1">View</Text>
            <ChevronRight color="#5F4B8B" size={16} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 pt-6 pb-2">
        <Text className="text-3xl font-sans font-bold text-text mb-1">Neighborhood Feed</Text>
        <Text className="text-text-muted font-sans text-base">
          Discover tasks tailored to your interests.
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5F4B8B" />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#5F4B8B"
              colors={['#5F4B8B']}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-10">
              <MapPin color="#64748B" size={48} className="mb-4 opacity-50" />
              <Text className="text-text font-sans font-bold text-lg mb-2">No tasks found</Text>
              <Text className="text-text-muted font-sans text-center">
                Be the first to ask for help or offer your services in your area!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}