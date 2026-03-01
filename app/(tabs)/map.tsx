import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';

// We update our interface to handle groups of tasks
interface Task {
  id: string;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
}

interface LocationCluster {
  id: string;
  latitude: number;
  longitude: number;
  tasks: Task[];
}

// map pin
const MapPinMarker = memo(({ cluster, isSeniorMode, onPress }: { cluster: LocationCluster, isSeniorMode: boolean, onPress: () => void }) => {
  const taskCount = cluster.tasks.length;
  // Let the marker track changes initially, then freeze it after 1 second
  const [trackChanges, setTrackChanges] = useState(true);

  return (
    <Marker 
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={onPress} // 2. Trigger the alert directly from the marker tap
      tracksViewChanges={trackChanges} // Start true, turn false after render
    >
      <View 
        onLayout={() => { setTimeout(() => setTrackChanges(false), 500); }}
        style={{ 
          backgroundColor: isSeniorMode ? '#000000' : '#5F4B8B',
          borderColor: '#FFFFFF',
          borderWidth: 2,
          borderRadius: 20, 
          width: 36, 
          height: 36, 
          alignItems: 'center',
          justifyContent: 'center', 
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 4,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>
          {taskCount}
        </Text>
      </View>
    </Marker>
  );
});

/**
 * @description Neighborhood Map Visualization
 * Human-Centric Goal: Provides spatial awareness of mutual aid requests.
 * Adaptivity Connection: Directly applies the `userInterfaceStyle` to the native map 
 * so it automatically turns to a dark map theme when Senior Mode is activated.
 */
export default function MapScreen() {
  const router = useRouter();
  // session so we can use the Smart RPC
  const { isSeniorMode, session } = useAppStore();
  
  // State now holds clusters instead of individual tasks
  const [clusters, setClusters] = useState<LocationCluster[]>([]);
  const [loading, setLoading] = useState(true);

  // Ref to control the MapView camera
  const mapRef = useRef<MapView>(null);

  // Default fallback region (Wider view of Athens)
  const INITIAL_REGION = {
    latitude: 37.9838,
    longitude: 23.7275,
    latitudeDelta: 0.2, // Wider zoom level
    longitudeDelta: 0.2,
  };

  // Fetch user's actual GPS and animate the map to it!
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return; // Fail silently, they just stay at the default region
        
        const location = await Location.getCurrentPositionAsync({});
        
        // Smoothly animate the map to their current city/neighborhood
        mapRef.current?.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05, 
          longitudeDelta: 0.05,
        }, 1500); // 1.5 second smooth animation
      } catch (error) {
        console.warn("Could not get location for map focus", error);
      }
    })();
  }, []);

  const fetchTaskLocations = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Use the exact same Smart RPC as the feed to bypass RLS and sync data perfectly!
      const { data, error } = await supabase
        .rpc('fetch_adaptive_feed', { calling_user_id: session.user.id });

      if (error) throw error;
      
      const validTasks = (data || []).filter((t: Task) => t.latitude && t.longitude);

      // MARKER GROUPING
      // This merges all tasks that share the exact same GPS coordinates
      // We use .toFixed(3) (approx 100 meters) to forcefully group tasks in the same general area!
      const grouped = validTasks.reduce((acc: Record<string, LocationCluster>, task: any) => {
        const safeLat = Number(task.latitude).toFixed(3);
        const safeLon = Number(task.longitude).toFixed(3);
        const clusterId = `${safeLat},${safeLon}`;

        if (!acc[clusterId]) {
          acc[clusterId] = { 
            id: clusterId, 
            latitude: task.latitude, 
            longitude: task.longitude, 
            tasks: [] 
          };
        }
        acc[clusterId].tasks.push(task);
        return acc;
      }, {} as Record<string, LocationCluster>);

      setClusters(Object.values(grouped));

    } catch (error) {
      const err = error as Error;
      Alert.alert('Map Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Re-fetch pins every time the user taps the Map tab!
  useFocusEffect(
    useCallback(() => {
      fetchTaskLocations();
    }, [fetchTaskLocations])
  );

  // When a user taps the callout bubble, we tell them to check the feed
  const handleMarkerPress = useCallback(() => {
    Alert.alert(
      "Neighborhood Tasks", 
      "Head over to your Smart Feed to view and accept these tasks!",
      [{ text: "Go to Feed", onPress: () => router.push('/(tabs)') }, { text: "Cancel", style: "cancel" }]
    );
  }, [router]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#5F4B8B" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <MapView 
        ref={mapRef} 
        style={StyleSheet.absoluteFillObject}
        initialRegion={INITIAL_REGION}
        showsUserLocation={true}
        userInterfaceStyle={isSeniorMode ? 'dark' : 'light'}
        // Optional: Adds a little padding to the map controls so they don't hug the very top edge
        mapPadding={{ top: 20, right: 0, bottom: 0, left: 0 }}
      >
        {clusters.map((cluster) => (
          <MapPinMarker 
            key={cluster.id} 
            cluster={cluster} 
            isSeniorMode={isSeniorMode} 
            onPress={handleMarkerPress} 
          />
        ))}
      </MapView>
    </SafeAreaView>
  );
}