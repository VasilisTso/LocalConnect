import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { Lock, Navigation, PlusCircle } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
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

import Colors from "@/constants/Colors";

// We use the same categories as the profile tags to ensure the
// Adaptivity Engine can easily match tasks to user interests.
const CATEGORIES = [
  "Pets",
  "Education",
  "Tools",
  "Errands",
  "Tech",
  "Cars",
  "Music",
  "Entertainment",
  "Home & Garden",
  "Fitness",
];

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

  // Ref to control the ScrollView
  const scrollViewRef = useRef<ScrollView>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  // Secure Handshake State
  const [privateInfo, setPrivateInfo] = useState("");

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

  // We should add colors for lucide icons based on Theme
  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
  const mutedIconColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  // Force the screen to scroll to the absolute top every time the tab is opened
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

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
          private_contact_info: privateInfo.trim(),
        },
      ]);

      if (error) throw error;

      Alert.alert("Success!", "Your task has been posted to the neighborhood.");

      // Reset form
      setTitle("");
      setDescription("");
      setPrivateInfo("");

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
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        className="flex-1"
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          <View className="mb-6">
            <Text
              className={`font-sans font-bold text-text mb-2 ${isSeniorMode ? "text-3xl" : "text-3xl"}`}
            >
              Create a Task
            </Text>
            <Text
              className={`text-text-muted font-sans ${isSeniorMode ? "text-lg" : "text-base"}`}
            >
              Ask for help or offer your services to the neighborhood.
            </Text>
          </View>

          {/* Task Details Panel */}
          <View className="bg-surface rounded-2xl p-5 mb-6 border border-border dark:border-senior dark:border-border dark:rounded-senior">
            <View className="flex-row items-center mb-4">
              <PlusCircle
                color={primaryIconColor}
                size={isSeniorMode ? 28 : 24}
                className="mr-3"
              />
              <Text
                className={`text-text font-sans ml-2 font-bold ${isSeniorMode ? "text-xl" : "text-lg"}`}
              >
                Task Details
              </Text>
            </View>

            {/* Title Input */}
            <View className="mb-5">
              <Text
                className={`text-text font-sans font-semibold mb-2 ${isSeniorMode ? "text-lg" : "text-sm"}`}
              >
                Title
              </Text>
              <TextInput
                className={`bg-background border-2 border-border dark:border-senior dark:border-border rounded-xl dark:rounded-senior px-4 py-3 text-text font-sans ${isSeniorMode ? "text-lg" : "text-base"}`}
                placeholder="E.g., Need help moving a couch"
                placeholderTextColor={mutedIconColor}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Description Input */}
            <View className="mb-2">
              <Text
                className={`text-text font-sans font-semibold mb-2 ${isSeniorMode ? "text-lg" : "text-sm"}`}
              >
                Description (Public)
              </Text>
              <TextInput
                className={`bg-background border-2 border-border dark:border-senior dark:border-border rounded-xl dark:rounded-senior px-4 py-3 text-text font-sans min-h-[100px] ${isSeniorMode ? "text-lg" : "text-base"}`}
                placeholder="Provide some details..."
                placeholderTextColor={mutedIconColor}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                // auto scroll when tap
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 150, animated: true });
                  }, 100);
                }}
              />
            </View>
          </View>

          {/* Secure Handshake Panel */}
          <View className="bg-surface rounded-2xl p-5 mb-6 border border-border dark:border-senior dark:border-border dark:rounded-senior">
            <View className="flex-row items-center mb-2">
              <Lock
                color={primaryIconColor}
                size={isSeniorMode ? 28 : 24}
                className="mr-3"
              />
              <Text
                className={`text-text font-sans ml-2 font-bold ${isSeniorMode ? "text-xl" : "text-lg"}`}
              >
                Secure Handshake (Private)
              </Text>
            </View>
            <Text
              className={`text-text-muted font-sans mb-5 ${isSeniorMode ? "text-base leading-6" : "text-sm"}`}
            >
              Only the specific neighbor you accept to help you can see this.
              Put your details so he knows where to come, like address, intercom
              name, or phone number here.
            </Text>
            <TextInput
              className={`bg-background border-2 border-border dark:border-senior dark:border-border rounded-xl dark:rounded-senior px-4 py-3 text-text font-sans min-h-[80px] ${isSeniorMode ? "text-lg" : "text-base"}`}
              placeholder="E.g., Ring bell 'Papadopoulos'. My number is 69..."
              placeholderTextColor={mutedIconColor}
              value={privateInfo}
              onChangeText={setPrivateInfo}
              multiline
              textAlignVertical="top"
              // Auto-scroll deep down when tapped
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 350, animated: true });
                }, 100);
              }}
            />
          </View>

          {/* Category Panel */}
          <View className="bg-surface rounded-2xl p-5 mb-6 border border-border dark:border-senior dark:border-border dark:rounded-senior">
            <Text
              className={`text-text font-sans font-bold mb-5 ${isSeniorMode ? "text-xl" : "text-lg"}`}
            >
              Category
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {CATEGORIES.map((cat) => {
                const isActive = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    activeOpacity={0.7}
                    onPress={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-full border-2 dark:rounded-senior dark:border-senior ${
                      isActive
                        ? "bg-primary border-primary dark:bg-primary dark:border-primary"
                        : "bg-transparent border-border dark:border-border"
                    }`}
                  >
                    <Text
                      className={`font-sans font-semibold ${
                        isActive ? "text-white dark:text-white" : "text-text"
                      } ${isSeniorMode ? "text-lg" : "text-base"}`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Neighborhood Selector Panel */}
          <View className="bg-surface rounded-2xl p-5 mb-8 border border-border dark:border-senior dark:border-border dark:rounded-senior">
            <View className="flex-row items-center mb-2">
              <Navigation
                color={primaryIconColor}
                size={isSeniorMode ? 28 : 24}
                className="mr-3"
              />
              <Text
                className={`text-text font-sans ml-2 font-bold ${isSeniorMode ? "text-xl" : "text-lg"}`}
              >
                General Location (Kept private)
              </Text>
            </View>
            <Text
              className={`text-text-muted font-sans mb-5 ${isSeniorMode ? "text-base leading-6" : "text-sm"}`}
            >
              Used to match you with nearby neighbors. Exact location is kept
              private.
            </Text>

            {/* GPS Button */}
            <TouchableOpacity
              onPress={handleUseMyLocation}
              disabled={gettingLocation}
              activeOpacity={0.7}
              className={`flex-row items-center px-4 py-4 rounded-xl border-2 dark:rounded-senior dark:border-senior mb-5 ${
                fuzzedGps
                  ? "bg-secondary border-secondary dark:bg-secondary dark:border-secondary"
                  : "bg-transparent border-border dark:border-border"
              }`}
            >
              {gettingLocation ? (
                <ActivityIndicator
                  color={fuzzedGps ? (isSeniorMode ? "#FFFFFF" : "#1A1826") : primaryIconColor}
                  size="small"
                  className="mr-3"
                />
              ) : (
                <Navigation
                  color={fuzzedGps ? (isSeniorMode ? "#FFFFFF" : "#1A1826") : primaryIconColor}
                  size={isSeniorMode ? 26 : 24}
                  className="mr-3"
                />
              )}
              <View className="ml-2 flex-1">
                <Text
                  className={`font-sans font-bold ${fuzzedGps ? "text-on-secondary dark:text-on-secondary" : "text-text"} ${isSeniorMode ? "text-xl" : "text-base"}`}
                >
                  Use My Current Area
                </Text>
                {fuzzedGps && (
                  <Text
                    className={`text-on-secondary opacity-80 font-sans mt-0.5 ${isSeniorMode ? "text-base" : "text-xs"}`}
                  >
                    Anonymized to 1Km radius
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <View className="flex-row items-center mb-5">
              <View className="flex-1 h-[1px] bg-border dark:bg-border" />
              <Text className={`mx-4 text-text-muted font-sans font-bold ${isSeniorMode ? "text-base" : "text-sm"}`}>
                OR MANUALLY SELECT
              </Text>
              <View className="flex-1 h-[1px] bg-border dark:bg-border" />
            </View>

            {/* Manual Neighborhoods */}
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {NEIGHBORHOODS.map((hood) => {
                const isActive = selectedHood === hood.name;
                return (
                  <TouchableOpacity
                    key={hood.name}
                    style={{ width: "48%" }}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedHood(hood.name);
                      setFuzzedGps(null); // Clear GPS if they select a manual node
                    }}
                    className={`px-2 py-4 rounded-xl border-2 dark:rounded-senior dark:border-senior items-center justify-center ${
                      isActive
                        ? "bg-secondary border-secondary dark:bg-secondary dark:border-secondary"
                        : "bg-transparent border-border dark:border-border"
                    }`}
                  >
                    <Text
                      className={`font-sans font-semibold text-center ${
                        isActive ? "text-on-secondary dark:text-on-secondary" : "text-text"
                      } ${isSeniorMode ? "text-lg" : "text-sm"}`}
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
            className="bg-primary py-4 dark:py-5 rounded-xl dark:rounded-senior dark:border-senior dark:border-primary items-center flex-row justify-center active:opacity-80"
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
