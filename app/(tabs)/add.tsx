import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Navigation } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// We use the same categories as the profile tags to ensure the
// Adaptivity Engine can easily match tasks to user interests.
const CATEGORIES = ["Pets", "Education", "Tools", "Errands", "Tech Support"];

// Privacy by Design: We use fuzzed "Neighborhood Centroids" instead of exact GPS.
const NEIGHBORHOODS = [
  { name: "Athens", lon: 23.7275, lat: 37.9838 },
  { name: "Thessaloniki", lon: 22.9444, lat: 40.6401 },
  { name: "Patras", lon: 21.7346, lat: 38.2466 },
  { name: "Ioannina", lon: 20.8537, lat: 39.665 },
  { name: "Crete", lon: 24.8093, lat: 35.2401 },
  { name: "Volos", lon: 22.9453, lat: 39.3605 },
];

/**
 * @description Create Task Screen
 * Human-Centric Goal: A distraction-free, highly legible form for users to request or offer help.
 * Adaptivity Connection: The selected `category` is the primary metadata used by the `fetch_adaptive_feed`
 * to rank this task in other users' feeds.
 * Privacy Check: Enforces location fuzzing by using predefined neighborhood nodes instead of raw GPS.
 */
export default function AddTaskScreen() {
  const router = useRouter();
  const { session, isSeniorMode } = useAppStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  // Location States
  const [selectedHood, setSelectedHood] = useState<string>(
    NEIGHBORHOODS[2].name,
  );
  const [fuzzedGps, setFuzzedGps] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [loading, setLoading] = useState(false);

  // The Privacy-Preserving GPS Function
  async function handleUseMyLocation() {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please enable location services to use this feature.",
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      // PRIVACY FUZZING: Round to nearest 0.01 (1km accuracy)
      const safeLat = Number(
        (Math.round(location.coords.latitude / 0.01) * 0.01).toFixed(2),
      );
      const safeLon = Number(
        (Math.round(location.coords.longitude / 0.01) * 0.01).toFixed(2),
      );

      setFuzzedGps({ lat: safeLat, lon: safeLon });
      setSelectedHood(""); // Deselect the hardcoded neighborhoods
    } catch (error) {
      Alert.alert("Error", "Could not determine your location.");
    } finally {
      setGettingLocation(false);
    }
  }

  async function handleCreateTask() {
    Keyboard.dismiss();

    if (!title.trim() || !description.trim()) {
      Alert.alert("Missing Info", "Please provide a title and description.");
      return;
    }

    if (!session?.user?.id) {
      Alert.alert(
        "Authentication Error",
        "You must be logged in to create a task.",
      );
      return;
    }

    // Determine final coordinates based on what they selected
    let finalLat = 0;
    let finalLon = 0;

    if (fuzzedGps) {
      finalLat = fuzzedGps.lat;
      finalLon = fuzzedGps.lon;
    } else {
      const hood = NEIGHBORHOODS.find((n) => n.name === selectedHood);
      if (hood) {
        finalLat = hood.lat;
        finalLon = hood.lon;
      }
    }

    if (!finalLat || !finalLon) {
      Alert.alert("Location Error", "Please select a location for this task.");
      return;
    }

    setLoading(true);
    try {
      // Format the coordinate specifically for PostGIS GEOGRAPHY(POINT) insertion
      const locationString = `POINT(${finalLon} ${finalLat})`;

      const { error } = await supabase.from("tasks").insert([
        {
          user_id: session.user.id,
          title: title.trim(),
          description: description.trim(),
          category: category,
          location: locationString,
          status: "open",
        },
      ]);

      if (error) throw error;

      Alert.alert("Success!", "Your task has been posted to the neighborhood.");

      // Reset form
      setTitle("");
      setDescription("");

      // Route user back to the feed to see their new post
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert(
        "Error Creating Task",
        error.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6">
            <Text
              className={`font-sans font-bold text-text mb-2 ${isSeniorMode ? "text-4xl" : "text-3xl"}`}
            >
              Create a Task
            </Text>
            <Text
              className={`text-text-muted font-sans ${isSeniorMode ? "text-lg" : "text-base"}`}
            >
              Ask for help or offer your services to the neighborhood.
            </Text>
          </View>

          {/* Title Input */}
          <View className="mb-4">
            <Text
              className={`text-text font-sans font-semibold mb-1 ${isSeniorMode ? "text-base" : "text-sm"}`}
            >
              Title
            </Text>
            <TextInput
              className={`bg-surface border border-surface-highlight rounded-xl px-4 py-3 text-text font-sans ${isSeniorMode ? "text-lg" : "text-base"}`}
              placeholder="E.g., Need help moving a couch"
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description Input */}
          <View className="mb-6">
            <Text
              className={`text-text font-sans font-semibold mb-1 ${isSeniorMode ? "text-base" : "text-sm"}`}
            >
              Description
            </Text>
            <TextInput
              className={`bg-surface border border-surface-highlight rounded-xl px-4 py-3 text-text font-sans min-h-[100px] ${isSeniorMode ? "text-lg" : "text-base"}`}
              placeholder="Provide some details..."
              placeholderTextColor="#64748B"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Category Selector */}
          <View className="mb-6">
            <Text
              className={`text-text font-sans font-semibold mb-2 ${isSeniorMode ? "text-base" : "text-sm"}`}
            >
              Category
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {CATEGORIES.map((cat) => {
                const isActive = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-full border ${isActive ? "bg-primary border-primary" : "bg-surface border-surface-highlight"}`}
                  >
                    <Text
                      className={`font-sans font-semibold ${isActive ? "text-white" : "text-text-muted"} ${isSeniorMode ? "text-lg" : "text-sm"}`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Neighborhood Selector */}
          <View className="mb-8">
            <Text
              className={`text-text font-sans font-semibold mb-2 ${isSeniorMode ? "text-base" : "text-sm"}`}
            >
              General Location (Kept private)
            </Text>

            {/* GPS Button */}
            <TouchableOpacity
              onPress={handleUseMyLocation}
              disabled={gettingLocation}
              className={`flex-row items-center px-4 py-3 rounded-lg border mb-3 ${fuzzedGps ? "bg-secondary border-secondary" : "bg-surface border-surface-highlight"}`}
            >
              {gettingLocation ? (
                <ActivityIndicator
                  color={fuzzedGps ? "#1F1C2C" : "#5F4B8B"}
                  size="small"
                  className="mr-3"
                />
              ) : (
                <Navigation
                  color={fuzzedGps ? "#1F1C2C" : "#5F4B8B"}
                  size={20}
                  className="mr-3"
                />
              )}
              <View>
                <Text
                  className={`font-sans ml-2 font-bold ${fuzzedGps ? "text-text" : "text-primary"} ${isSeniorMode ? "text-lg" : "text-base"}`}
                >
                  Use My Current Area
                </Text>
                {fuzzedGps && (
                  <Text
                    className={`text-text-muted font-sans mt-0.5 ${isSeniorMode ? "text-sm" : "text-xs"}`}
                  >
                    Anonymized to 1Km radius
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <View className="flex-row items-center mb-3">
              <View className="flex-1 h-[1px] bg-surface-highlight" />
              <Text className="mx-4 text-text-muted font-sans text-sm">OR</Text>
              <View className="flex-1 h-[1px] bg-surface-highlight" />
            </View>

            {/* Manual Neighborhoods */}
            <View className="flex-row flex-wrap justify-between gap-y-2">
              {NEIGHBORHOODS.map((hood) => {
                const isActive = selectedHood === hood.name;
                return (
                  <TouchableOpacity
                    key={hood.name}
                    // Force width to take up 1/3 of the row minus margin/gap for 3 column grid
                    style={{ width: '32%' }}
                    onPress={() => {
                      setSelectedHood(hood.name);
                      setFuzzedGps(null); // Clear GPS if they select a manual node
                    }}
                    className={`px-1 py-3 rounded-lg border items-center justify-center ${isActive ? "bg-secondary border-secondary" : "bg-surface border-surface-highlight"}`}
                  >
                    <Text
                      className={`font-sans font-semibold text-center ${isActive ? "text-text" : "text-text-muted"} ${isSeniorMode ? "text-base" : "text-sm"}`}
                    >
                      {hood.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className="bg-primary py-4 rounded-xl items-center flex-row justify-center"
            onPress={handleCreateTask}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                className={`text-white font-sans font-bold ${isSeniorMode ? "text-xl" : "text-lg"}`}
              >
                Post Task
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
