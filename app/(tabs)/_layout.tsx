import { Tabs, useRouter } from 'expo-router';
import { Home, Map as MapIcon, PlusCircle, User, LayoutList } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';

export default function TabLayout() {
  const { isSeniorMode, session, showAlert } = useAppStore();
  const router = useRouter();

  // Get the device's safe area measurements
  const insets = useSafeAreaInsets();

  // Real-Time WebSocket Listener
  useEffect(() => {
    // If nobody is logged in, don't listen
    if (!session?.user?.id) return;

    // LISTENER 1: I am the OWNER. Tell me if someone offers help.
    const ownerSubscription = supabase
      .channel('owner_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          // ONLY listen to tasks that belong to the logged-in user
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          // If the status just changed to 'pending', it means someone offered to help
          if (payload.new.status === 'pending') {
            showAlert(
              "A Neighbor Wants to Help!",
              `Someone just offered to help with: "${payload.new.title}". You can now accept or decline their offer.`,
              [
                { text: "Dismiss", style: "cancel" },
                { 
                  text: "View Task", // Updated text
                  style: "default", 
                  // Routes directly to the exact task details screen!
                  onPress: () => router.push({ 
                    pathname: '/task-details', 
                    params: { 
                      id: payload.new.id, 
                      title: payload.new.title, 
                      description: payload.new.description, 
                      category: payload.new.category, 
                      status: payload.new.status, 
                      user_id: payload.new.user_id, 
                      helper_id: payload.new.helper_id, 
                      private_contact_info: payload.new.private_contact_info 
                    }
                  }) 
                }
              ]
            );
          }
        }
      )
      .subscribe();

    // LISTENER 2: I am the HELPER. Tell me if the owner accepts my offer.
    const helperSubscription = supabase
      .channel('helper_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `helper_id=eq.${session.user.id}`,
        },
        (payload) => {
          if (payload.new.status === 'in_progress') {
            showAlert(
              "Offer Accepted!",
              `The owner accepted your help for: "${payload.new.title}". You can now view their private contact instructions!`,
              [
                { text: "Dismiss", style: "cancel" },
                { 
                  text: "View Task", 
                  style: "default", 
                  // Navigates directly to the task details screen!
                  onPress: () => router.push({ pathname: '/task-details', params: { id: payload.new.id, title: payload.new.title, description: payload.new.description, category: payload.new.category, status: payload.new.status, user_id: payload.new.user_id, helper_id: payload.new.helper_id, private_contact_info: payload.new.private_contact_info }}) 
                }
              ]
            );
          }
        }
      )
      .subscribe();

    // Cleanup: Close both connections if the user logs out
    return () => {
      supabase.removeChannel(ownerSubscription);
      supabase.removeChannel(helperSubscription);
    };
  }, [session?.user?.id]); // Restart listener if the logged-in user changes

  // Calculate tab bar colors based on mode
  const activeColor = isSeniorMode ? Colors.dark.tabIconSelected : Colors.light.tabIconSelected;
  const inactiveColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;
  const backgroundColor = isSeniorMode ? Colors.dark.surface : Colors.light.surface;
  const borderColor = isSeniorMode ? Colors.dark.border : Colors.light.border;

  // Dynamic math to calculate the perfect height based on the user's specific phone
  const basePadding = Platform.OS === 'ios' ? 10 : 10;
  const bottomPadding = Math.max(insets.bottom, basePadding); // Use either the nav bar height, or 10px minimum
  const baseHeight = isSeniorMode ? 65 : 55; // Base height of the actual icons/text
  const totalHeight = baseHeight + bottomPadding; // Total height of the tab bar

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor, 
        tabBarInactiveTintColor: inactiveColor, // Dimmed icons when not selected
        tabBarShowLabel: isSeniorMode, // Show labels only in Senior Mode
        
        // UI styling for the Tab Bar
        tabBarStyle: {
          backgroundColor: backgroundColor,
          borderTopColor: borderColor,
          borderTopWidth: isSeniorMode ? 3 : 1,
          height: totalHeight,
          paddingBottom: bottomPadding, 
          paddingTop: Platform.OS === 'ios' ? 10 : 8,
        },
        
        // Styling the text labels specifically for Senior Mode
        tabBarLabelStyle: {
          fontSize: isSeniorMode ? 14 : 12,
          fontWeight: 'bold',
          marginTop: 3, // Add a little breathing room between the icon and the text
        },

        // Center the icons perfectly in Normal mode since there are no labels
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        }
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Home', 
          tabBarIcon: ({ color }) => <Home color={color} size={isSeniorMode ? 32 : 28} />
        }} 
      />
      <Tabs.Screen 
        name="feed" 
        options={{ 
          title: 'Feed', 
          tabBarIcon: ({ color }) => <LayoutList color={color} size={isSeniorMode ? 32 : 28} />
        }} 
      />
      <Tabs.Screen 
        name="add" 
        options={{ 
          title: 'Add Task', 
          tabBarIcon: ({ color }) => <PlusCircle color={color} size={isSeniorMode ? 32 : 28} />
        }} 
      />
      <Tabs.Screen 
        name="map" 
        options={{ 
          title: 'Map', 
          tabBarIcon: ({ color }) => <MapIcon color={color} size={isSeniorMode ? 32 : 28} />
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile', 
          tabBarIcon: ({ color }) => <User color={color} size={isSeniorMode ? 32 : 28} />
        }} 
      />
    </Tabs>
  );
}