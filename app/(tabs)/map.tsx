import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { LocateFixed, Map as MapIcon } from "lucide-react-native";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/Colors";

// We update our interface to handle groups of tasks
interface Task {
  id: string;
  title: string;
  category: string;
  status: string;
  user_id: string;
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
const MapPinMarker = memo(
  ({
    cluster,
    isSeniorMode,
    onPress,
  }: {
    cluster: LocationCluster;
    isSeniorMode: boolean;
    onPress: () => void;
  }) => {
    const taskCount = cluster.tasks.length;
    // Let the marker track changes initially, then freeze it after 1 second
    const [trackChanges, setTrackChanges] = useState(true);

    const bgColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
    const actualTextColor = "#FFFFFF";
    const borderColor = isSeniorMode ? Colors.dark.border : Colors.light.surface;
    
    const pinSize = isSeniorMode ? 44 : 34;
    const fontSize = isSeniorMode ? 18 : 16;
    
    useEffect(() => {
      setTrackChanges(true);
    }, [isSeniorMode, taskCount]);

    return (
      <Marker 
        coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
        onPress={onPress} // Trigger the alert directly from the marker tap
        tracksViewChanges={trackChanges}
      >
        <View 
        onLayout={() => { setTimeout(() => setTrackChanges(false), 500); }}
        style={{ 
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: isSeniorMode ? 2 : 1,
          borderRadius: 20, 
          width: 34, 
          height: 34, 
          alignItems: 'center',
          justifyContent: 'center', 
        }}
      >
        <Text style={{ color: actualTextColor, fontWeight: 'bold', fontSize: fontSize }}>
          {taskCount}
        </Text>
      </View>
    </Marker>
  );
});

// official google maps night mode colors, on android i cant make it auto change like ios
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

/**
 * @description Neighborhood Map Visualization
 * Human-Centric Goal: Provides spatial awareness of mutual aid requests.
 * Adaptivity Connection: Directly applies the `userInterfaceStyle` to the native map
 * so it automatically turns to a dark map theme when Senior Mode is activated.
 */
export default function MapScreen() {
  const router = useRouter();
  // session so we can use the Smart RPC
  const { isSeniorMode, session, showAlert } = useAppStore();

  // State now holds clusters instead of individual tasks
  const [clusters, setClusters] = useState<LocationCluster[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
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

  // Center map on user
  const recenterMap = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      let location = await Location.getLastKnownPositionAsync({});
      if (!location) {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
      }

      mapRef.current?.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000,
      );
    } catch (error) {
      console.warn("Could not get location for map focus", error);
    }
  }, []);

  useEffect(() => {
    recenterMap();
  }, [recenterMap]);

  const fetchTaskLocations = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // MACRO-AWARENESS: Fetch ALL open tasks in the world, + my own active tasks
      // Use new dedicated Map RPC
      // safely bypasses RLS and automatically formats the coordinates
      const { data, error } = await supabase.rpc("fetch_map_markers");

      if (error) throw error;

      // Filter out any data that somehow lacks coordinates
      const validTasks = (data || []).filter(
        (t: Task) => t.latitude && t.longitude,
      );
      setTotalTasks(validTasks.length);

      // MARKER GROUPING
      // This merges all tasks that share the exact same GPS coordinates
      // We use .toFixed(3) (approx 100 meters) to forcefully group tasks in the same general area!
      const grouped = validTasks.reduce(
        (acc: Record<string, LocationCluster>, task: any) => {
          const safeLat = Number(task.latitude).toFixed(3);
          const safeLon = Number(task.longitude).toFixed(3);
          const clusterId = `${safeLat},${safeLon}`;

          if (!acc[clusterId]) {
            acc[clusterId] = {
              id: clusterId,
              latitude: task.latitude,
              longitude: task.longitude,
              tasks: [],
            };
          }
          acc[clusterId].tasks.push(task);
          return acc;
        },
        {} as Record<string, LocationCluster>,
      );

      setClusters(Object.values(grouped));
    } catch (error) {
      const err = error as Error;
      showAlert("Map Error", err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Re-fetch pins every time the user taps the Map tab!
  useFocusEffect(
    useCallback(() => {
      fetchTaskLocations();
    }, [fetchTaskLocations]),
  );

  // When a user taps the callout bubble, we tell them to check the feed
  const handleMarkerPress = useCallback(() => {
    showAlert(
      "Neighborhood Tasks",
      "Head over to your Smart Feed to view and accept these tasks!",
      [
        { text: "Go to Feed", onPress: () => router.push("/feed") },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }, [router]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator
          size="large"
          color={isSeniorMode ? Colors.dark.primary : Colors.light.primary}
        />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 relative">
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={INITIAL_REGION}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          
          //ios
          userInterfaceStyle={isSeniorMode ? "light" : "dark"}
          //android
          customMapStyle={isSeniorMode ? [] : darkMapStyle}

          mapPadding={{ top: 80, right: 0, bottom: 80, left: 0 }}
        >
          {clusters.map((cluster) => (
            <MapPinMarker
              key={`${cluster.id}-${isSeniorMode ? "senior" : "standard"}`}
              cluster={cluster}
              isSeniorMode={isSeniorMode}
              onPress={handleMarkerPress}
            />
          ))}
        </MapView>

        {/* Header */}
        <View
          className="absolute inset-x-0 top-4 items-center"
          pointerEvents="box-none"
        >
          <View className="bg-surface border-2 border-border dark:border-senior dark:border-border rounded-full flex-row items-center px-6 py-3 shadow-lg pointer-events-auto">
            <MapIcon
              color={isSeniorMode ? Colors.dark.primary : Colors.light.primary}
              size={isSeniorMode ? 26 : 20}
              className="mr-3"
            />
            <Text
              className={`font-sans ml-2 font-bold text-text ${isSeniorMode ? "text-lg" : "text-base"}`}
            >
              {totalTasks} Active Tasks
            </Text>
          </View>
        </View>

        {/* FLOATING RECENTER BUTTON */}
        <View className="absolute right-6 bottom-6" pointerEvents="box-none">
          <TouchableOpacity
            onPress={recenterMap}
            activeOpacity={0.8}
            className="bg-primary dark:bg-primary w-16 h-16 rounded-full items-center justify-center border-2 border-border dark:border-senior dark:border-border shadow-xl pointer-events-auto"
          >
            <LocateFixed color="#FFFFFF" size={isSeniorMode ? 32 : 28} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
