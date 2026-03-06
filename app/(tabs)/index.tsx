import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  TextInput, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
  HeartHandshake, 
  Map as MapIcon, 
  PlusCircle, 
  User, 
  LayoutList, 
  Award, 
  CheckCircle,
  Footprints,
  Car,
  BellRing,
  ChevronRight
} from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';

// Interface for the Active Task banner
interface ActiveTask {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  user_id: string;
  helper_id: string;
  private_contact_info: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { session, isSeniorMode, userProfile, fetchUserProfile, showAlert } = useAppStore();

  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Onboarding State
  const [onboardingTags, setOnboardingTags] = useState<string[]>([]);
  const [onboardingMode, setOnboardingMode] = useState<'walking' | 'driving'>('walking');
  const [onboardingUsername, setOnboardingUsername] = useState('');
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  const AVAILABLE_TAGS = ["Pets", "Education", "Tools", "Errands", "Tech", "Cars", "Music", "Entertainment", "Home & Garden", "Fitness"];
  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
  const mutedIconColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  // DYNAMIC TIME-BASED GREETING
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Fetch profile data(senior mode, karma, etc)
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile(session.user.id);
    }
  }, [session?.user?.id]);

  // Fetch the user's completed tasks count for the Recent Activity section
  useFocusEffect(
    useCallback(() => {
      async function fetchActivity() {
        if (!session?.user?.id) return;
        try {
          // Fetch Completed Tasks Count
          const { count, error: countError } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('helper_id', session.user.id)
            .eq('status', 'completed');

          if (!countError && count !== null) {
            setCompletedTasksCount(count);
          }

          // Fetch Active (In Progress) Task for the Sticky Banner
          // Looks for any task where status is in_progress AND you are either the owner OR the helper
          const { data: activeData, error: activeError } = await supabase
            .from('tasks')
            .select('*')
            .eq('status', 'in_progress')
            .or(`user_id.eq.${session.user.id},helper_id.eq.${session.user.id}`)
            .limit(1);

          if (!activeError && activeData && activeData.length > 0) {
            setActiveTask(activeData[0] as ActiveTask);
          } else {
            setActiveTask(null);
          }

        } catch (error) {
          console.error("Error fetching activity:", error);
        } finally {
          setLoadingActivity(false);
        }
      }
      fetchActivity();
    }, [session?.user?.id])
  );

  async function handleFinishOnboarding() {
    if (!session?.user?.id) return;
    if (!onboardingUsername.trim()) {
      showAlert("Missing Name", "Please enter a username or first name to continue.");
      return;
    }
    setSavingOnboarding(true);
    
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
      showAlert("Error saving profile", error.message);
      setSavingOnboarding(false);
      return;
    }

    await fetchUserProfile(session.user.id);
    setSavingOnboarding(false);
  }

  // Quick Access Button Component
  const QuickAccessButton = ({ title, icon: Icon, route, color }: any) => (
    <TouchableOpacity 
      onPress={() => router.push(route)}
      activeOpacity={0.7}
      className="bg-surface border border-border dark:border-senior dark:border-border p-4 rounded-2xl dark:rounded-senior w-[48%] mb-4 items-center justify-center shadow-sm dark:shadow-none"
    >
      <View className="bg-background p-4 rounded-full mb-3 border border-border dark:border-senior">
        <Icon color={color} size={isSeniorMode ? 32 : 28} />
      </View>
      <Text className={`font-sans font-bold text-text text-center ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      
      {/* ONBOARDING MODAL (Moved here so it shows up instantly on login) */}
      {userProfile !== null && userProfile.onboarding_completed === false && (
        <Modal animationType="slide" transparent={false} visible={true}>
          <SafeAreaView className="flex-1 bg-background px-8 pt-5">
            <View className="flex-1 w-full max-w-2xl mx-auto">
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="items-center mb-10 mt-6">
                  <View className="bg-primary/20 p-8 rounded-full mb-6">
                    <HeartHandshake color={primaryIconColor} size={isSeniorMode ? 72 : 64} />
                  </View>
                  <Text className={`font-sans font-bold text-text text-center mb-3 ${isSeniorMode ? 'text-3xl' : 'text-3xl'}`}>Welcome to the Neighborhood!</Text>
                  <Text className={`text-text-muted font-sans text-center px-4 ${isSeniorMode ? 'text-lg leading-7' : 'text-lg'}`}>Let's set up your profile so we can show you the tasks that matter to you.</Text>
                </View>

                {/* Username Input */}
                <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-xl' : 'text-xl'}`}>1. What should neighbors call you?</Text>
                <View className="mb-10">
                  <TextInput
                    className={`bg-surface border-2 border-border dark:border-senior rounded-xl dark:rounded-senior px-5 py-4 text-text font-sans ${isSeniorMode ? 'text-xl' : 'text-lg'}`}
                    placeholder="Enter a username or first name..."
                    placeholderTextColor={mutedIconColor}
                    value={onboardingUsername}
                    onChangeText={setOnboardingUsername}
                  />
                </View>

                {/* Transport Mode */}
                <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-xl' : 'text-xl'}`}>2. How far can you travel to help?</Text>
                <View className={`flex-row gap-4 mb-10 ${isSeniorMode ? 'flex-col' : ''}`}>
                  <TouchableOpacity onPress={() => setOnboardingMode('walking')} activeOpacity={0.7} className={`flex-1 flex-row items-center justify-center p-5 rounded-xl border-2 dark:rounded-senior dark:border-senior ${onboardingMode === 'walking' ? 'bg-primary border-primary dark:bg-primary' : 'bg-transparent border-border'}`}>
                    <Footprints color={onboardingMode === 'walking' ? '#FFFFFF' : mutedIconColor} size={isSeniorMode ? 26 : 24} className="mr-3" />
                    <View className='ml-2'>
                      <Text className={`font-sans font-bold ${onboardingMode === 'walking' ? 'text-on-primary dark:text-white' : 'text-text'} ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>Walking</Text>
                      <Text className={`font-sans ${onboardingMode === 'walking' ? 'text-on-primary opacity-80 dark:text-white' : 'text-text-muted'} ${isSeniorMode ? 'text-base' : 'text-base'}`}>7.5 km</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setOnboardingMode('driving')} activeOpacity={0.7} className={`flex-1 flex-row items-center justify-center p-5 rounded-xl border-2 dark:rounded-senior dark:border-senior ${onboardingMode === 'driving' ? 'bg-primary border-primary dark:bg-primary' : 'bg-transparent border-border'}`}>
                    <Car color={onboardingMode === 'driving' ? '#FFFFFF' : mutedIconColor} size={isSeniorMode ? 26 : 24} className="mr-3" />
                    <View className='ml-2'>
                      <Text className={`font-sans font-bold ${onboardingMode === 'driving' ? 'text-on-primary dark:text-white' : 'text-text'} ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>Driving</Text>
                      <Text className={`font-sans ${onboardingMode === 'driving' ? 'text-on-primary opacity-80 dark:text-white' : 'text-text-muted'} ${isSeniorMode ? 'text-base' : 'text-base'}`}>35.0 km</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Interests */}
                <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-xl' : 'text-xl'}`}>3. What are your hobbies? (Pick a few)</Text>
                <View className="flex-row flex-wrap gap-3 mb-12">
                  {AVAILABLE_TAGS.map((tag) => {
                    const isActive = onboardingTags.includes(tag);
                    return (
                      <TouchableOpacity key={tag} activeOpacity={0.7} onPress={() => setOnboardingTags(prev => isActive ? prev.filter(t => t !== tag) : [...prev, tag])} className={`px-4 py-3 rounded-full border-2 dark:rounded-senior dark:border-senior ${isActive ? 'bg-primary border-primary dark:bg-primary' : 'bg-transparent border-border'}`}>
                        <Text className={`font-sans font-bold ${isActive ? 'text-on-primary dark:text-white' : 'text-text'} ${isSeniorMode ? 'text-lg' : 'text-base'}`}>{tag}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity className="bg-primary py-5 rounded-xl dark:rounded-senior dark:border-senior dark:border-primary items-center mb-10 shadow-lg" onPress={handleFinishOnboarding} disabled={savingOnboarding} activeOpacity={0.8}>
                  {savingOnboarding ? <ActivityIndicator color="#FFFFFF" /> : <Text className={`text-on-primary dark:text-white font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-xl'}`}>Let's Go!</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* Normal Home dashboard */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>
        
        {/* HEADER */}
        <View className="pt-6 pb-8">
          <Text className={`font-sans font-bold text-text ${isSeniorMode ? 'text-3xl' : 'text-3xl'}`}>Home</Text>
          <Text className={`text-text-muted font-sans mt-1 ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
            {getGreeting()}, {userProfile?.username || 'Neighbor'}!
          </Text>
        </View>

        {/* ACTIVE TASK BANNER */}
        {activeTask && (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => router.push({
              pathname: '/task-details',
              params: {
                id: activeTask.id,
                title: activeTask.title,
                description: activeTask.description,
                category: activeTask.category,
                status: activeTask.status,
                user_id: activeTask.user_id,
                helper_id: activeTask.helper_id,
                private_contact_info: activeTask.private_contact_info || '',
              }
            })}
            className="bg-surface border-2 border-primary dark:border-senior p-4 rounded-2xl dark:rounded-senior mb-8 flex-row items-center shadow-sm dark:shadow-none"
          >
            <View className={`p-3 rounded-full mr-4 border ${isSeniorMode ? 'bg-background border-border' : 'bg-primary/10 border-primary/20'}`}>
              <BellRing color={primaryIconColor} size={isSeniorMode ? 28 : 24} />
            </View>
            <View className="flex-1 mr-2">
              <Text className={`font-sans font-bold text-text ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
                Active Task
              </Text>
              <Text className={`text-text-muted font-sans mt-1 ${isSeniorMode ? 'text-base' : 'text-sm'}`} numberOfLines={1}>
                {activeTask.title}
              </Text>
            </View>
            <ChevronRight color={mutedIconColor} size={isSeniorMode ? 28 : 24} />
          </TouchableOpacity>
        )}

        {/* LOGO SECTION */}
        <View className="items-center justify-center py-6 mb-8 bg-surface rounded-3xl dark:rounded-senior border border-border dark:border-senior dark:border-border shadow-sm dark:shadow-none">
          <View className="bg-primary/10 p-6 rounded-full mb-4 border border-primary/20">
            <HeartHandshake color={primaryIconColor} size={isSeniorMode ? 64 : 56} />
          </View>
          <Text className={`font-sans font-bold text-text ${isSeniorMode ? 'text-2xl' : 'text-2xl'}`}>LocalConnect</Text>
          <Text className={`text-text-muted font-sans mt-2 text-center px-4 ${isSeniorMode ? 'text-base' : 'text-sm'}`}>
            Stronger together, one task at a time.
          </Text>
        </View>

        {/* QUICK ACCESS GRID */}
        <Text className={`font-sans font-bold text-text mb-4 ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>Quick Access</Text>
        <View className="flex-row flex-wrap justify-between mb-8">
          <QuickAccessButton title="Feed" icon={LayoutList} route="/feed" color={primaryIconColor} />
          <QuickAccessButton title="Map" icon={MapIcon} route="/map" color={isSeniorMode ? Colors.dark.success : "#10B981"} />
          <QuickAccessButton title="Ask for Help" icon={PlusCircle} route="/add" color={isSeniorMode ? Colors.dark.primary : "#3B82F6"} />
          <QuickAccessButton title="Profile" icon={User} route="/profile" color={isSeniorMode ? Colors.dark.secondary : "#F59E0B"} />
        </View>

        {/* RECENT ACTIVITY SECTION */}
        <Text className={`font-sans font-bold text-text mb-4 ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>Recent Activity</Text>
        <View className="bg-surface rounded-2xl dark:rounded-senior border border-border dark:border-senior p-5 flex-row items-center justify-between shadow-sm dark:shadow-none mb-4">
          <View className="flex-row items-center flex-1">
            <View className={`p-4 rounded-full mr-4 border ${isSeniorMode ? 'bg-background border-border' : 'bg-[#D1FAE5] border-[#059669]'}`}>
              <CheckCircle color={isSeniorMode ? Colors.dark.success : "#059669"} size={isSeniorMode ? 28 : 24} />
            </View>
            <View>
              <Text className={`font-sans font-bold text-text ${isSeniorMode ? 'text-lg' : 'text-lg'}`}>Tasks Completed</Text>
              <Text className={`text-text-muted font-sans mt-1 ${isSeniorMode ? 'text-base' : 'text-sm'}`}>Helped your neighborhood</Text>
            </View>
          </View>
          {loadingActivity ? (
            <ActivityIndicator color={primaryIconColor} />
          ) : (
            <Text className={`font-sans font-bold ${isSeniorMode ? 'text-success text-3xl' : 'text-success text-3xl'}`}>{completedTasksCount}</Text>
          )}
        </View>

        <View className="bg-surface rounded-2xl dark:rounded-senior border border-border dark:border-senior p-5 flex-row items-center justify-between shadow-sm dark:shadow-none mb-8">
          <View className="flex-row items-center flex-1">
            <View className={`p-4 rounded-full mr-4 border ${isSeniorMode ? 'bg-background border-border' : 'bg-secondary border-[#D97706]'}`}>
              <Award color={isSeniorMode ? Colors.dark.secondary : "#D97706"} size={isSeniorMode ? 28 : 24} />
            </View>
            <View>
              <Text className={`font-sans font-bold text-text ${isSeniorMode ? 'text-lg' : 'text-lg'}`}>Total Karma</Text>
              <Text className={`text-text-muted font-sans mt-1 ${isSeniorMode ? 'text-base' : 'text-sm'}`}>Community trust points</Text>
            </View>
          </View>
          <Text className={`font-sans font-bold text-secondary ${isSeniorMode ? 'text-3xl' : 'text-3xl'}`}>{userProfile?.karma_points || 0}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}