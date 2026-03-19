import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useAppStore } from '@/store/useAppStore';

export default function NoInternet() {
  const netInfo = useNetInfo();
  const isSeniorMode = useAppStore((state) => state.isSeniorMode);

  // If we haven't loaded the network state yet, or if we ARE connected, render nothing.
  if (netInfo.isConnected === null || netInfo.isConnected === true) {
    return null;
  }

  // If offline, render a full-screen blocking overlay
  return (
    <View style={[
      styles.container, 
      { backgroundColor: isSeniorMode ? Colors.dark.background : Colors.light.background }
    ]}>
      <WifiOff size={80} color={isSeniorMode ? Colors.dark.tint : Colors.light.tint} />
      <Text style={[
        styles.title, 
        { color: isSeniorMode ? Colors.dark.text : Colors.light.text }
      ]}>
        No Internet Connection
      </Text>
      <Text style={[
        styles.subtitle, 
        { color: isSeniorMode ? Colors.dark.text : Colors.light.text }
      ]}>
        LocalConnect requires an active Wi-Fi or cellular connection to load the map and community updates.
        {"\n"}
        Please close the app, find a connection and relaunch the app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject, // Forces it to cover the entire screen
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999, // Ensures it sits on top of EVERYTHING
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    opacity: 0.8,
  },
});