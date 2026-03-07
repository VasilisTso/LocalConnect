import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Tag, Trash2, ChevronRight, Edit2, HeartHandshake, MessageCircle, Star, ShieldAlert, User as UserIcon, Shield, Award, Footprints, Car } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';

import Colors from '@/constants/Colors';

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
  if (karma < 0) return { title: 'Flagged', color: Colors.light.error, icon: ShieldAlert };
  if (karma < 50) return { title: 'New Neighbor', color: Colors.light.tabIconDefault, icon: UserIcon };
  if (karma < 150) return { title: 'Active Helper', color: Colors.light.primary, icon: Shield };
  return { title: 'Local Hero', color: Colors.light.secondary, icon: Award }; 
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
  // Pull in userProfile and fetchUserProfile to check for Admin status
  const { session, isSeniorMode, userProfile, fetchUserProfile, setUserProfile, showAlert } = useAppStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendingReviews, setPendingReviews] = useState<PendingReviewTask[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State to toggle between Community Feed and My Tasks
  const [filterMode, setFilterMode] = useState<'community' | 'mine' | 'reports'>('community');
  const [reportedTaskIds, setReportedTaskIds] = useState<string[]>([]);

  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
  const mutedIconColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  // Securely sync profile and wipe memory on account switch
  useEffect(() => {
    // If nobody is logged in, wipe the memory completely
    if (!session?.user?.id) {
      setUserProfile(null);
      return;
    }

    // If the memory still holds the PREVIOUS user (Admin), wipe it instantly
    if (userProfile && userProfile.id !== session.user.id) {
      setUserProfile(null);
    }

    // Fetch the fresh profile for the new user
    fetchUserProfile(session.user.id);
    
  }, [session?.user?.id]); // Only re-run when the actual Session ID changes

  // Fetch both the Smart Feed AND any tasks waiting for a review
  const fetchTasks = useCallback(async () => {
    // `fetch_adaptive_feed` RPC!
    // NEW ADAPTIVITY ENGINE FETCH
    if (!session?.user?.id) return; // Failsafe

    try {
      // Get User's Current Location for the Spatial Engine
      let currentLat = null;
      let currentLon = null;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Use Last Known Position first for instant loading 
          // If null, fallback to calculating current position
          let loc = await Location.getLastKnownPositionAsync({});
          if (!loc) {
            loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          }
          
          if (loc) {
            currentLat = loc.coords.latitude;
            currentLon = loc.coords.longitude;
          }
        }
      } catch (e) {
        console.warn("Could not fetch location for spatial filter.");
      }

      // Fetch Open Tasks (Smart Engine + Spatial Filter - public community feed)
      const { data: openTasks, error: feedError } = await supabase
        .rpc('fetch_adaptive_feed', { 
          calling_user_id: session.user.id,
          user_lat: currentLat,
          user_lon: currentLon
        });
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

      // Fetch Reports if Admin
      let adminReportIds: string[] = [];
      let adminReportedTasks: Task[] = [];
      if (userProfile?.is_admin) {
        const { data: reports } = await supabase.from('reports').select('task_id');
        if (reports && reports.length > 0) {
          adminReportIds = reports.map(r => r.task_id);
          setReportedTaskIds(adminReportIds);
          
          // Fetch the actual tasks that were reported
          const { data: rTasks } = await supabase.from('tasks').select('*').in('id', adminReportIds);
          if (rTasks) adminReportedTasks = rTasks;
        } else {
          setReportedTaskIds([]);
        }
      }

      // MERGE ALL AND REMOVE DUPLICATES (using Map by ID)
      const allTasks = [...(openTasks || []), ...(myTasks || []), ...(helpingTasks || []), ...adminReportedTasks];
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
      showAlert('Error', error.message);
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
    showAlert('Delete Task', 'Are you sure you want to remove this request?', [
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
            // If it was a reported task, instantly remove it from the list
            setReportedTaskIds(prev => prev.filter(id => id !== taskId));
          } catch (error: any) {
            showAlert('Error deleting task', error.message);
          }
        }
      }
    ]);
  }

  // UI Component for individual task cards
  const renderTask = ({ item }: { item: Task }) => {
    const isAdmin = userProfile?.is_admin === true;
    const isMyTask = session?.user?.id === item.user_id;

    // only edit if you own it and it's open
    const canEdit = isMyTask && item.status === 'open';
    // delete if you own it and it's open, OR if you are a global Admin
    const canDelete = (isMyTask && item.status === 'open') || isAdmin;

    return (
      <TouchableOpacity 
        className="bg-surface rounded-2xl dark:rounded-senior p-5 mb-5 border border-border dark:border-senior dark:border-border shadow-sm dark:shadow-none"
        onPress={() => handleViewTask(item)}
        activeOpacity={0.7}
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-2">
            {filterMode === 'mine' && item.status !== 'open' && (
              <View 
                style={{ alignSelf: 'flex-start' }}
                className={`px-3 py-1.5 rounded-md mb-3 border ${
                  item.status === 'in_progress' 
                    ? 'bg-[#D1FAE5] border-[#065F46]' 
                    : 'bg-[#FEF3C7] border-[#92400E]'
                }`}
              >
                <Text className={`text-xs font-bold font-sans uppercase ${item.status === 'in_progress' ? 'text-[#065F46]' : 'text-[#92400E]'}`}>
                  {item.status === 'in_progress' ? 'In Progress' : 'Pending Approval'}
                </Text>
              </View>
            )}
            
            <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-xl'}`} numberOfLines={2}>
              {item.title}
            </Text>
          </View>

          {/* Owner/Admin controls: Edit/Delete (Only show if it's still Open) */}
          {(canEdit || canDelete) && (
            <View className="flex-row items-center -mr-2 -mt-2">
              {canEdit && (
                <TouchableOpacity onPress={() => router.push({ pathname: '/modal', params: { taskId: item.id } })} className="p-3 mr-1">
                  <Edit2 color={isSeniorMode ? Colors.dark.primary : Colors.light.primary} size={isSeniorMode ? 24 : 20} />
                </TouchableOpacity>
              )}
              {canDelete && (
                <TouchableOpacity onPress={() => handleDeleteTask(item.id)} className="p-3">
                  <Trash2 color={isSeniorMode ? Colors.dark.error : Colors.light.error} size={isSeniorMode ? 24 : 20} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <Text className={`text-text-muted font-sans mb-6 ${isSeniorMode ? 'text-base leading-6' : 'text-base leading-6'}`} numberOfLines={3}>
          {item.description}
        </Text>

        <View className="flex-row items-center justify-between mt-auto">
          {/* Category Tag */}
          <View className="flex-row items-center bg-background px-4 py-2 rounded-full border border-border dark:border-senior dark:border-border">
            <Tag color={primaryIconColor} size={isSeniorMode ? 18 : 16} className="mr-2" />
            <Text className={`text-text-muted ml-1 font-sans font-bold ${isSeniorMode ? 'text-sm' : 'text-xs'}`}>
              {item.category}
            </Text>
          </View>

          {/* Creator's Trust Badge (Visible in ALL modes for safety!) */}
          <View 
            className="flex-row items-center px-4 py-2 rounded-full border"
            style={{ backgroundColor: `${getBadge(item.creator_karma || 0).color}15`, borderColor: getBadge(item.creator_karma || 0).color }}
          >
            {React.createElement(getBadge(item.creator_karma || 0).icon, { 
              color: getBadge(item.creator_karma || 0).color, 
              size: isSeniorMode ? 18 : 14, 
              className: "mr-2" 
            })}
            <Text 
              className={`font-sans ml-2 font-bold ${isSeniorMode ? 'text-sm' : 'text-xs'}`} 
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
      <View className="mb-8">
        <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
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
            className="bg-secondary/10 border-2 border-secondary rounded-xl dark:rounded-senior p-5 flex-row items-center justify-between mb-4 shadow-sm"
          >
            <View className="flex-1 pr-4">
              <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`} numberOfLines={1}>
                {task.title}
              </Text>
              <Text className={`text-text-muted font-sans mt-2 ${isSeniorMode ? 'text-base' : 'text-sm'}`}>
                A neighbor helped you with this!
              </Text>
            </View>
            <View className="bg-surface px-5 py-3 rounded-full flex-row items-center border-2 border-secondary">
              <Star color={Colors.light.secondary} fill={Colors.light.secondary} size={isSeniorMode ? 20 : 18} className="mr-2" />
              <Text className={`text-text ml-2 font-sans font-bold ${isSeniorMode ? 'text-base' : 'text-sm'}`}>Rate</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Filter the tasks array right before rendering!
  const displayTasks = tasks.filter(task => {
    if (filterMode === 'reports') {
      return reportedTaskIds.includes(task.id);
    }
    if (filterMode === 'mine') {
      // "My Tasks" now shows tasks I created OR tasks I am actively helping with
      return (task.user_id === session?.user?.id || task.helper_id === session?.user?.id) && task.status !== 'completed';
    }
    // For 'community', ONLY show tasks that are still open and belong to other people.
    // This stops pending tasks from cluttering the public feed!
    return task.user_id !== session?.user?.id && task.status === 'open';
  });

  // Smart Sorting Pins active tasks to the top of the list.
  const sortedTasks = [...displayTasks].sort((a, b) => {
    // Define priority (1 is highest, goes to the top)
    const priority: Record<string, number> = { in_progress: 1, pending: 2, open: 3 };
    
    const rankA = priority[a.status] || 4;
    const rankB = priority[b.status] || 4;
    
    return rankA - rankB; // Sorts lowest number to the top
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-6 pt-6 pb-4">
        {/* Mod Badge next to the title */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className={`font-sans font-bold text-text ${isSeniorMode ? 'text-3xl' : 'text-3xl'}`}>Neighborhood</Text>
          {userProfile?.is_admin && (
            <View className="bg-error px-4 py-2 rounded-md ml-3 border-2 border-border dark:border-error">
              <Text className="text-white font-bold text-lg uppercase">ADMIN</Text>
            </View>
          )}
        </View>
        <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
          {filterMode === 'community' ? 'Discover tasks tailored to your interests.' : filterMode === 'reports' ? 'Moderate reported tasks.' : 'Manage your open requests.'}
        </Text>
      </View>

      {/* Segmented Control Toggle (Third tab only visible to Admin) */}
      <View className="flex-row bg-surface border-2 border-border dark:border-senior dark:border-border p-1.5 rounded-xl dark:rounded-senior mx-6 mb-6">
        <TouchableOpacity 
          className={`flex-1 py-3 items-center rounded-lg dark:rounded-sm ${filterMode === 'community' ? 'bg-primary dark:bg-primary' : 'bg-transparent'}`} 
          onPress={() => setFilterMode('community')}
        >
          <Text className={`font-sans font-bold ${filterMode === 'community' ? 'text-on-primary dark:text-white' : 'text-text-muted'} ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
            Community
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className={`flex-1 py-3 items-center rounded-lg dark:rounded-sm ${filterMode === 'mine' ? 'bg-primary dark:bg-primary' : 'bg-transparent'}`} 
          onPress={() => setFilterMode('mine')}
        >
          <Text className={`font-sans font-bold ${filterMode === 'mine' ? 'text-on-primary dark:text-white' : 'text-text-muted'} ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
            My Tasks
          </Text>
        </TouchableOpacity>

        {userProfile?.is_admin && (
          <TouchableOpacity 
            className={`flex-1 py-3 items-center rounded-lg dark:rounded-sm ${filterMode === 'reports' ? 'bg-error dark:bg-error' : 'bg-transparent'}`} 
            onPress={() => setFilterMode('reports')}
          >
            <Text className={`font-sans font-bold ${filterMode === 'reports' ? 'text-white' : 'text-text-muted'} ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
              🚩 Review
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={primaryIconColor} />
        </View>
      ) : (
        <FlatList
          data={sortedTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          ListHeaderComponent={filterMode === 'mine' ? renderPendingReviews : null}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={primaryIconColor}
              colors={[primaryIconColor]}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <MapPin color={mutedIconColor} size={isSeniorMode ? 56 : 48} className="mb-6 opacity-50" />
              <Text className={`text-text font-sans font-bold text-center mb-3 ${isSeniorMode ? 'text-xl' : 'text-xl'}`}>
                {filterMode === 'mine' ? "You have no open tasks" : "No community tasks found"}
              </Text>
              <Text className={`text-text-muted font-sans text-center px-6 ${isSeniorMode ? 'text-base leading-6' : 'text-base leading-6'}`}>
                {filterMode === 'mine' 
                  ? "Tap the '+' tab to ask your neighborhood for help!" 
                  : "Check back later or ask for help yourself!"}
              </Text>
            </View>
          }
        />
      )}
      
    </SafeAreaView>
  );
}