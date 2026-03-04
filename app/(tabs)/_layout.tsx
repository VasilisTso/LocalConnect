import { Tabs, useRouter } from 'expo-router';
import { Home, Map as MapIcon, PlusCircle, User } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function TabLayout() {
  const { isSeniorMode, session } = useAppStore();
  const router = useRouter();

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
            Alert.alert(
              "A Neighbor Wants to Help!",
              `Someone just offered to help with: "${payload.new.title}". Go to your Feed to accept or decline.`,
              [
                { text: "Dismiss", style: "cancel" },
                { text: "Go to Feed", style: "default", onPress: () => router.push('/(tabs)') }
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
            Alert.alert(
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // We use the CSS variable here so the tab bar adapts to Senior Mode automatically!
        tabBarActiveTintColor: isSeniorMode ? '#FFB300' : '#5F4B8B', // Fallback colors representing primary/secondary
        tabBarStyle: {
          backgroundColor: isSeniorMode ? '#FFFFFF' : '#FAFAFA',
          borderTopColor: isSeniorMode ? '#E9ECEF' : '#F3F0FF',
        },
        tabBarShowLabel: isSeniorMode, // Adaptivity: Show labels in Senior Mode for better accessibility
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Feed', 
          tabBarIcon: ({ color }) => <Home color={color} size={isSeniorMode ? 28 : 24} /> 
        }} 
      />
      <Tabs.Screen 
        name="map" 
        options={{ 
          title: 'Map', 
          tabBarIcon: ({ color }) => <MapIcon color={color} size={isSeniorMode ? 28 : 24} /> 
        }} 
      />
      <Tabs.Screen 
        name="add" 
        options={{ 
          title: 'Add Task', 
          tabBarIcon: ({ color }) => <PlusCircle color={color} size={isSeniorMode ? 28 : 24} /> 
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile', 
          tabBarIcon: ({ color }) => <User color={color} size={isSeniorMode ? 28 : 24} /> 
        }} 
      />
    </Tabs>
  );
}