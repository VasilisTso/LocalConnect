import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { MapPin } from 'lucide-react-native';

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

  // Focus the map on Athens area
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
      
      // Filter out any anomalous data
      const validTasks = (data || []).filter(t => t.latitude && t.longitude);
      setTasks(validTasks);
    } catch (error) {
      const err = error as Error;
      Alert.alert('Map Error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaskLocations();
  }, [fetchTaskLocations]);

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
        // MAGIC: This forces the native map to adopt a dark theme when Senior Mode is active!
        userInterfaceStyle={isSeniorMode ? 'dark' : 'light'}
      >
        {tasks.map((task) => (
          <Marker 
            key={task.id}
            coordinate={{ latitude: task.latitude, longitude: task.longitude }}
          >
            {/* Custom Marker Icon */}
            <View className="bg-primary p-2 rounded-full border-2 border-white shadow-md">
              <MapPin color="#FFFFFF" size={16} />
            </View>
            
            {/* The popup bubble when you tap the marker */}
            <Callout tooltip>
              <View className="bg-surface p-3 rounded-xl border border-surface-highlight shadow-lg min-w-[150px]">
                <Text className="text-text font-sans font-bold text-base mb-1">
                  {task.title}
                </Text>
                <Text className="text-primary font-sans text-xs font-semibold uppercase">
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