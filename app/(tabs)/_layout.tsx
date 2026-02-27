import { Tabs } from 'expo-router';
import { Home, Map as MapIcon, PlusCircle, User } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';

export default function TabLayout() {
  const { isSeniorMode } = useAppStore();

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