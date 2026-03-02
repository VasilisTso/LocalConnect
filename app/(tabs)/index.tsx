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
import { MapPin, Tag, Trash2, ChevronRight, Edit2, HeartHandshake, MessageCircle, Star, ShieldAlert, User as UserIcon, Shield, Award } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useRouter, useFocusEffect } from 'expo-router';

// Define the shape of Task data
interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  creator_karma?: number;
  // Note: PostGIS location comes back as a WKB/GeoJSON or string depending on the query, 
  // but for the UI list, we primarily rely on the category and title.
  // Smart RPC returns these to push to task details for location
  latitude?: number;
  longitude?: number;
  helper_id?: string;
  private_contact_info?: string;
}

// Helper function to calculate badges
function getBadge(karma: number) {
  if (karma < 0) return { title: 'Flagged', color: '#EF4444', icon: ShieldAlert };
  if (karma < 50) return { title: 'New Neighbor', color: '#64748B', icon: UserIcon };
  if (karma < 150) return { title: 'Active Helper', color: '#5F4B8B', icon: Shield };
  return { title: 'Local Hero', color: '#D97706', icon: Award }; 
}

// Interface to hold tasks waiting for a review
interface PendingReviewTask extends Task {
  helper_id: string;
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
  const [pendingReviews, setPendingReviews] = useState<PendingReviewTask[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State to toggle between Community Feed and My Tasks
  const [filterMode, setFilterMode] = useState<'community' | 'mine'>('community');

  // Fetch both the Smart Feed AND any tasks waiting for a review
  const fetchTasks = useCallback(async () => {
    // `fetch_adaptive_feed` RPC!
    // NEW ADAPTIVITY ENGINE FETCH
    if (!session?.user?.id) return; // Failsafe

    try {
      // Fetch Open Tasks (Smart Engine - public community feed)
      const { data: openTasks, error: feedError } = await supabase
        .rpc('fetch_adaptive_feed', { calling_user_id: session.user.id });
      if (feedError) throw feedError;

      // Fetch MY active tasks (keeps them visible when pending or in_progress)
      const { data: myTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .neq('status', 'completed');

      // Fetch tasks I am helping with (so helpers can see if they were accepted)
      const { data: helpingTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('helper_id', session.user.id)
        .neq('status', 'completed');

      // MERGE ALL 3 AND REMOVE DUPLICATES (using Map by ID)
      const allTasks = [...(openTasks || []), ...(myTasks || []), ...(helpingTasks || [])];
      const uniqueTasks = Array.from(new Map(allTasks.map(task => [task.id, task])).values());
      
      setTasks(uniqueTasks);

      // PENDING REVIEWS LOGIC Fetch Completed Tasks (to see if they need a review)
      const { data: myCompletedTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'completed')
        .eq('user_id', session.user.id)
        .not('helper_id', 'is', null); // Must have a helper to review!

      // Fetch Reviews I have already written
      const { data: myReviews } = await supabase
        .from('reviews')
        .select('task_id')
        .eq('reviewer_id', session.user.id);

      // Filter out tasks that I've already reviewed
      const reviewedTaskIds = myReviews?.map(r => r.task_id) || [];
      const needsReview = myCompletedTasks?.filter(t => !reviewedTaskIds.includes(t.id)) || [];
      
      setPendingReviews(needsReview as PendingReviewTask[]);

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  // Use focus effect so the pending review disappears instantly after submitting it!
  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  // IMPLICIT FEEDBACK: Learning mechanism, now leads to details screen
  async function handleViewTask(task: Task & { helper_id?: string, private_contact_info?: string }) {
    if (!session?.user?.id) return;

    try {
      // Silently log the interaction in the background
      await supabase.from('user_interactions').insert([{
        user_id: session.user.id,
        task_id: task.id,
        interaction_type: 'viewed_category_' + task.category // e.g., viewed_category_Pets
      }]);
    } catch (error) {
      console.error("Failed to log interaction silently", error);
    }

    // Route to Details screen and pass the task data
    router.push({
      pathname: '/task-details',
      params: {
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        creator_karma: task.creator_karma || 0,
        user_id: task.user_id,
        latitude: task.latitude,
        longitude: task.longitude,
        status: task.status,
        helper_id: task.helper_id || '',
        private_contact_info: task.private_contact_info || '',
      }
    });
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

  // --- THE KARMA RESOLUTION LOGIC ---
  async function handleHelpOut(task: Task) {
    Alert.alert(
      'Offer Help', 
      'Are you sure you want to complete this task? You will earn 10 Karma Points!', 
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'I Helped!', 
          style: 'default',
          onPress: async () => {
            try {
              // This calls the secure RPC function we created earlier
              const { error } = await supabase.rpc('resolve_task', {
                target_task_id: task.id,
                helper_id: session?.user?.id
              });

              if (error) throw error;

              Alert.alert('Thank you!', 'You earned 10 Karma Points for helping your neighborhood.');
              // Instantly remove it from the UI feed
              setTasks(prev => prev.filter(t => t.id !== task.id));
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
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
        <View className="flex-row justify-between items-start mb-4">
          {/* SCALED TITLES */}
          <Text className={`text-text font-sans font-bold flex-1 mr-2 ${isSeniorMode ? 'text-2xl leading-8' : 'text-lg'}`} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Owner controls: Edit/Delete */}
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

        <Text className={`text-text-muted font-sans mb-10 ${isSeniorMode ? 'text-lg leading-7' : 'text-sm'}`} numberOfLines={4}>
          {item.description}
        </Text>

        <View className="flex-row items-center justify-between mt-auto">
          {/* Category Tag */}
          <View className="flex-row items-center bg-background px-3 py-1.5 rounded-full border border-surface-highlight">
            <Tag color="#5F4B8B" size={16} className="mr-2" />
            <Text className={`text-text-muted ml-2 font-sans font-semibold ${isSeniorMode ? 'text-sm' : 'text-xs'}`}>
              {item.category}
            </Text>
          </View>

          {/* Creator's Trust Badge (Visible in ALL modes for safety!) */}
          <View 
            className="flex-row items-center px-3 py-1.5 rounded-full border"
            style={{ backgroundColor: `${getBadge(item.creator_karma || 0).color}15`, borderColor: getBadge(item.creator_karma || 0).color }}
          >
            {React.createElement(getBadge(item.creator_karma || 0).icon, { 
              color: getBadge(item.creator_karma || 0).color, 
              size: isSeniorMode ? 18 : 14, // Scales up in Senior Mode
              className: "mr-1.5" 
            })}
            <Text 
              className={`font-sans ml-2 font-bold ${isSeniorMode ? 'text-sm' : 'text-xs'}`} // Scales up in Senior Mode
              style={{ color: getBadge(item.creator_karma || 0).color }}
            >
              {getBadge(item.creator_karma || 0).title}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // UI component specifically for tasks needing a review
  const renderPendingReviews = () => {
    if (pendingReviews.length === 0) return null;

    return (
      <View className="mb-6">
        <Text className={`text-text font-sans font-bold mb-3 ${isSeniorMode ? 'text-xl' : 'text-base'}`}>
          Tasks Pending Review ({pendingReviews.length})
        </Text>
        {pendingReviews.map(task => (
          <TouchableOpacity 
            key={task.id}
            activeOpacity={0.8}
            onPress={() => router.push({ 
              pathname: '/review', 
              params: { taskId: task.id, helperId: task.helper_id, taskTitle: task.title } 
            })}
            className="bg-secondary/20 border-2 border-secondary rounded-xl p-4 flex-row items-center justify-between mb-3 shadow-sm"
          >
            <View className="flex-1 pr-4">
              <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-base'}`} numberOfLines={1}>
                {task.title}
              </Text>
              <Text className={`text-text-muted font-sans mt-1 ${isSeniorMode ? 'text-base' : 'text-xs'}`}>
                A neighbor helped you with this!
              </Text>
            </View>
            <View className="bg-surface px-4 py-2 rounded-full flex-row items-center border border-secondary">
              <Star color="#D97706" fill="#D97706" size={16} className="mr-2" />
              <Text className="text-text font-sans font-bold text-sm">Rate</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Filter the tasks array right before rendering!
  const displayTasks = tasks.filter(task => {
    if (filterMode === 'mine') {
      // "My Tasks" now shows tasks I created OR tasks I am actively helping with
      return task.user_id === session?.user?.id || task.helper_id === session?.user?.id;
    }

    // For 'community', ONLY show tasks that are still open and belong to other people.
    // This stops pending tasks from cluttering the public feed!
    return task.user_id !== session?.user?.id && task.status === 'open';
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 pt-6 pb-2">
        <Text className="text-3xl font-sans font-bold text-text mb-1">Neighborhood Feed</Text>
        <Text className="text-text-muted font-sans text-base">
          {filterMode === 'community' ? 'Discover tasks tailored to your interests.' : 'Manage your open requests.'}
        </Text>
      </View>

      {/* Segmented Control Toggle */}
      <View className="flex-row bg-surface border border-surface-highlight p-1 rounded-xl mx-6 mb-4">
        <TouchableOpacity 
          className={`flex-1 py-2.5 items-center rounded-lg ${filterMode === 'community' ? 'bg-secondary' : 'bg-transparent'}`}
          onPress={() => setFilterMode('community')}
        >
          <Text className={`font-sans font-bold ${filterMode === 'community' ? 'text-text' : 'text-text-muted'} ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
            Community
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-2.5 items-center rounded-lg ${filterMode === 'mine' ? 'bg-secondary' : 'bg-transparent'}`}
          onPress={() => setFilterMode('mine')}
        >
          <Text className={`font-sans font-bold ${filterMode === 'mine' ? 'text-text' : 'text-text-muted'} ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
            My Tasks
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5F4B8B" />
        </View>
      ) : (
        <FlatList
          data={displayTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          // INJECT PENDING REVIEWS on MY TASKS
          ListHeaderComponent={filterMode === 'mine' ? renderPendingReviews : null}
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
              <Text className="text-text font-sans font-bold text-lg mb-2">
                {filterMode === 'mine' ? "You have no open tasks" : "No community tasks found"}
              </Text>
              <Text className="text-text-muted font-sans text-center px-4">
                {filterMode === 'mine' 
                  ? "Tap the '+' tab to ask your neighborhood for help!" 
                  : "Check back later or ask for help yourself!"}
              </Text>
            </View>
          }
        />
      )}

      {/* THE FLOATING CHAT BUTTON */}
      <TouchableOpacity 
        className="absolute bottom-6 right-6 bg-primary w-16 h-16 rounded-full items-center justify-center shadow-lg border-2 border-surface"
        onPress={() => router.push('/chat')}
        activeOpacity={0.8}
      >
        <MessageCircle color="#FFFFFF" size={26} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}