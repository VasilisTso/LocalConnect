import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Tag, Trash2, ChevronRight, Edit2, HeartHandshake, MessageCircle, Star, ShieldAlert, User as UserIcon, Shield, Award, Footprints, Car } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';

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
  // Pull in userProfile and fetchUserProfile to check for Admin status
  const { session, isSeniorMode, userProfile, fetchUserProfile, setUserProfile } = useAppStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendingReviews, setPendingReviews] = useState<PendingReviewTask[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State to toggle between Community Feed and My Tasks
  const [filterMode, setFilterMode] = useState<'community' | 'mine' | 'reports'>('community');
  const [reportedTaskIds, setReportedTaskIds] = useState<string[]>([]);

  // State for onboarding(new user, welcome modal)
  const [onboardingTags, setOnboardingTags] = useState<string[]>([]);
  const [onboardingMode, setOnboardingMode] = useState<'walking' | 'driving'>('walking');
  const [onboardingUsername, setOnboardingUsername] = useState('');
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  const AVAILABLE_TAGS = [
    "Pets", "Education", "Tools", "Errands", "Tech", 
    "Cars", "Music", "Entertainment", "Home & Garden", "Fitness"
  ];

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
            // If it was a reported task, instantly remove it from the list
            setReportedTaskIds(prev => prev.filter(id => id !== taskId));
          } catch (error: any) {
            Alert.alert('Error deleting task', error.message);
          }
        }
      }
    ]);
  }

  // ONBOARDING LOGIC
  async function handleFinishOnboarding() {
    if (!session?.user?.id) return;

    // Force them to pick a name
    if (!onboardingUsername.trim()) {
      Alert.alert("Missing Name", "Please enter a username or first name to continue.");
      return;
    }

    setSavingOnboarding(true);
    
    // Save their choices and flip the flag to TRUE
    const { error } = await supabase
      .from('profiles')
      .update({ 
        tags: onboardingTags, 
        transport_mode: onboardingMode,
        onboarding_completed: true,
        username: onboardingUsername.trim()
      })
      .eq('id', session.user.id);

    if (error) {
      Alert.alert("Error saving profile", error.message);
      setSavingOnboarding(false);
      return;
    }

    // Refresh the local store and feed so the modal instantly closes and feed adapts!
    await fetchUserProfile(session.user.id);
    fetchTasks();
    setSavingOnboarding(false);
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
        className="bg-surface rounded-2xl p-4 mb-4 border border-surface-highlight shadow-sm"
        onPress={() => handleViewTask(item)}
        activeOpacity={0.7}
      >
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-1 mr-2">
            {/* Status Pill (Only shows up in "My Tasks" for active items) */}
            {filterMode === 'mine' && item.status !== 'open' && (
              <View 
                style={{ alignSelf: 'flex-start' }}
                className={`px-2 py-1 rounded-md mb-2 ${item.status === 'in_progress' ? 'bg-[#D1FAE5]' : 'bg-[#FEF3C7]'}`}
              >
                <Text className={`text-xs font-bold font-sans uppercase ${item.status === 'in_progress' ? 'text-[#065F46]' : 'text-[#92400E]'}`}>
                  {item.status === 'in_progress' ? 'In Progress' : 'Pending Approval'}
                </Text>
              </View>
            )}
            
            <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-2xl leading-8' : 'text-lg'}`} numberOfLines={2}>
              {item.title}
            </Text>
          </View>

          {/* Owner/Admin controls: Edit/Delete (Only show if it's still Open) */}
          {(canEdit || canDelete) && (
            <View className="flex-row items-center -mr-2 -mt-2">
              {canEdit && (
                <TouchableOpacity onPress={() => router.push({ pathname: '/modal', params: { taskId: item.id } })} className="p-2 mr-2">
                  <Edit2 color="#5f4b8b" size={20} />
                </TouchableOpacity>
              )}
              {canDelete && (
                <TouchableOpacity onPress={() => handleDeleteTask(item.id)} className="p-2">
                  <Trash2 color="#EF4444" size={20} />
                </TouchableOpacity>
              )}
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
    <SafeAreaView className="flex-1 bg-background">
      {/* THE WELCOME ONBOARDING MODAL */}
      {userProfile !== null && userProfile.onboarding_completed === false && (
        <Modal animationType="slide" transparent={false} visible={true}>
          <SafeAreaView className="flex-1 bg-background px-8 pt-5">
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="items-center mb-8 mt-4">
                <View className="bg-primary/20 p-6 rounded-full mb-6">
                  <HeartHandshake color="#5F4B8B" size={64} />
                </View>
                <Text className="text-3xl font-sans font-bold text-text text-center mb-2">
                  Welcome to the Neighborhood!
                </Text>
                <Text className="text-text-muted font-sans text-lg text-center px-4">
                  Let's set up your profile so we can show you the tasks that matter to you.
                </Text>
              </View>

              {/* Username Input */}
              <Text className="text-text font-sans font-bold text-xl mb-4">1. What should neighbors call you?</Text>
              <View className="mb-8">
                <TextInput
                  className={`bg-surface border border-surface-highlight rounded-xl px-4 py-4 text-text font-sans ${isSeniorMode ? 'text-xl' : 'text-lg'}`}
                  placeholder="Enter a username or first name..."
                  placeholderTextColor="#64748B"
                  value={onboardingUsername}
                  onChangeText={setOnboardingUsername}
                />
              </View>

              {/* Transport Mode */}
              <Text className="text-text font-sans font-bold text-xl mb-4">2. How far can you travel to help?</Text>
              <View className="flex-row gap-4 mb-8">
                <TouchableOpacity 
                  onPress={() => setOnboardingMode('walking')}
                  className={`flex-1 flex-row items-center justify-center p-4 rounded-xl border-2 ${onboardingMode === 'walking' ? 'bg-primary border-primary' : 'bg-surface border-surface-highlight'}`}
                >
                  <Footprints color={onboardingMode === 'walking' ? '#FFFFFF' : '#64748B'} size={24} className="mr-2" />
                  <View className='ml-2'>
                    <Text className={`font-sans font-bold text-lg ${onboardingMode === 'walking' ? 'text-white' : 'text-text'}`}>Walking</Text>
                    <Text className={`font-sans text-base ${onboardingMode === 'walking' ? 'text-[#E2D8F0]' : 'text-text-muted'}`}>7.5 km</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setOnboardingMode('driving')}
                  className={`flex-1 flex-row items-center justify-center p-4 rounded-xl border-2 ${onboardingMode === 'driving' ? 'bg-primary border-primary' : 'bg-surface border-surface-highlight'}`}
                >
                  <Car color={onboardingMode === 'driving' ? '#FFFFFF' : '#64748B'} size={24} className="mr-2" />
                  <View className='ml-2'>
                    <Text className={`font-sans font-bold text-lg ${onboardingMode === 'driving' ? 'text-white' : 'text-text'}`}>Driving</Text>
                    <Text className={`font-sans text-base ${onboardingMode === 'driving' ? 'text-[#E2D8F0]' : 'text-text-muted'} `}>35.0 km</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Interests */}
              <Text className="text-text font-sans font-bold text-xl mb-4">3. What are you good at or what are your hobbies? (Pick a few)</Text>
              <View className="flex-row flex-wrap  gap-3 mb-12">
                {AVAILABLE_TAGS.map((tag) => {
                  const isActive = onboardingTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => setOnboardingTags(prev => isActive ? prev.filter(t => t !== tag) : [...prev, tag])}
                      className={`px-5 py-3 rounded-full border-2 ${isActive ? 'bg-primary border-primary' : 'bg-surface border-surface-highlight'}`}
                    >
                      <Text className={`font-sans font-bold text-base ${isActive ? 'text-white' : 'text-text'}`}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Submit Button */}
              <TouchableOpacity 
                className="bg-primary py-5 rounded-xl items-center mb-10 shadow-lg"
                onPress={handleFinishOnboarding}
                disabled={savingOnboarding}
              >
                {savingOnboarding ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-sans font-bold text-xl">Let's Go!</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* STANDARD FEED UI BELOW */}
      <View className="px-6 pt-6 pb-2">
        {/* Cool Mod Badge next to the title */}
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-3xl font-sans font-bold text-text">Neighborhood Feed</Text>
          {userProfile?.is_admin && (
            <View className="bg-error px-4 py-2 rounded-md ml-3 border border-black">
              <Text className="text-white font-bold text-lg uppercase">ADMIN</Text>
            </View>
          )}
        </View>
        <Text className="text-text-muted font-sans text-base mt-1">
          {filterMode === 'community' ? 'Discover tasks tailored to your interests.' : filterMode === 'reports' ? 'Moderate reported tasks.' : 'Manage your open requests.'}
        </Text>
      </View>

      {/* Segmented Control Toggle (Third tab only visible to Admin) */}
      <View className="flex-row bg-surface border border-surface-highlight p-1 rounded-xl mx-6 mb-4">
        <TouchableOpacity className={`flex-1 py-2.5 items-center rounded-lg ${filterMode === 'community' ? 'bg-secondary' : 'bg-transparent'}`} onPress={() => setFilterMode('community')}>
          <Text className={`font-sans font-bold ${filterMode === 'community' ? 'text-text' : 'text-text-muted'} ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>Community</Text>
        </TouchableOpacity>
        
        <TouchableOpacity className={`flex-1 py-2.5 items-center rounded-lg ${filterMode === 'mine' ? 'bg-secondary' : 'bg-transparent'}`} onPress={() => setFilterMode('mine')}>
          <Text className={`font-sans font-bold ${filterMode === 'mine' ? 'text-text' : 'text-text-muted'} ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>My Tasks</Text>
        </TouchableOpacity>

        {userProfile?.is_admin && (
          <TouchableOpacity className={`flex-1 py-2.5 items-center rounded-lg ${filterMode === 'reports' ? 'bg-[rgba(239,68,68,0.2)]' : 'bg-transparent'}`} onPress={() => setFilterMode('reports')}>
            <Text className={`font-sans font-bold ${filterMode === 'reports' ? 'text-error' : 'text-text-muted'} ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>🚩 Review</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5F4B8B" />
        </View>
      ) : (
        <FlatList
          data={sortedTasks}
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