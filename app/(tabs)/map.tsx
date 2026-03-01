import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { MapPin } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';

interface TaskLocation {
  id: string;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
}

/**
 * @description Neighborhood Map Visualization
 * Human-Centric Goal: Provides spatial awareness of mutual aid requests.
 * Adaptivity Connection: Directly applies the `userInterfaceStyle` to the native map 
 * so it automatically turns to a dark map theme when Senior Mode is activated.
 */
export default function MapScreen() {
  const { isSeniorMode } = useAppStore();
  const [tasks, setTasks] = useState<TaskLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Focus the map on Melissia area
  const INITIAL_REGION = {
    latitude: 38.0500,
    longitude: 23.8333,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  const fetchTaskLocations = useCallback(async () => {
    try {
      // Thanks to our generated SQL columns, we get clean numbers back!
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, category, latitude, longitude')
        .eq('status', 'open');

      if (error) throw error;
      
      // Filter out invalid data and apply "Coordinate Jitter"
      const validTasks = (data || [])
        .filter(t => t.latitude && t.longitude)
        .map(t => {
          // Add a tiny random offset (~50 meters) so pins don't perfectly stack!
          const jitterLat = t.latitude + (Math.random() - 0.5) * 0.003;
          const jitterLon = t.longitude + (Math.random() - 0.5) * 0.003;
          
          return {
            ...t,
            latitude: jitterLat,
            longitude: jitterLon
          };
        });

      setTasks(validTasks);
    } catch (error) {
      const err = error as Error;
      Alert.alert('Map Error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch pins every time the user taps the Map tab!
  useFocusEffect(
    useCallback(() => {
      fetchTaskLocations();
    }, [fetchTaskLocations])
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#5F4B8B" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <MapView 
        style={StyleSheet.absoluteFillObject}
        initialRegion={INITIAL_REGION}
        showsUserLocation={true}
        // This forces the native map to adopt a dark theme when Senior Mode is active!
        userInterfaceStyle={isSeniorMode ? 'dark' : 'light'}
      >
        {tasks.map((task) => (
          <Marker 
            key={task.id}
            coordinate={{ latitude: task.latitude, longitude: task.longitude }}
            // Helps the map prioritize taps on overlapping clusters
            zIndex={1}
          >
            {/* Custom Marker Icon */}
            <View className="bg-primary p-2 rounded-full border-2 border-white shadow-md">
              <MapPin color="#FFFFFF" size={16} />
            </View>
            
            {/* The popup bubble when you tap the marker */}
            <Callout tooltip>
              <View className="bg-surface p-3 rounded-xl border border-surface-highlight shadow-lg min-w-[150px]">
                <Text className={`text-text font-sans font-bold mb-1 ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
                  {task.title}
                </Text>
                <Text className={`text-primary font-sans font-semibold uppercase ${isSeniorMode ? 'text-sm' : 'text-xs'}`}>
                  {task.category}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}