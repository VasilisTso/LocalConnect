import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Gift, Lock, CheckCircle, Info, Award, Coffee, Ticket, ShoppingBag, Shirt } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';

import Colors from '@/constants/Colors';

// Dummy data for the timeline milestones
const REWARDS_TRACK = [
  { id: 1, points: 50, title: "Free Pastry", description: "At local neighborhood bakeries.", icon: Coffee },
  { id: 2, points: 100, title: "Free Coffee", description: "At participating local cafes.", icon: Coffee },
  { id: 3, points: 150, title: "10% Grocery Discount", description: "One-time use at local markets.", icon: ShoppingBag },
  { id: 4, points: 200, title: "Movie Ticket", description: "1 free ticket at the town cinema.", icon: Ticket },
  { id: 5, points: 250, title: "Transit Pass", description: "Free 24hr city bus/train pass.", icon: Ticket },
  { id: 6, points: 300, title: "Local Hero T-Shirt", description: "Exclusive LocalConnect merch.", icon: Shirt },
];

export default function RewardsScreen() {
  const router = useRouter();
  const { isSeniorMode, userProfile } = useAppStore();
  
  // Grab the user's karma (fallback to 0)
  const currentKarma = userProfile?.karma_points || 0;

  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* HEADER */}
      <View className="flex-row items-center px-6 pt-4 pb-4 border-b border-border dark:border-senior dark:border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 -ml-2 active:opacity-70">
          <ArrowLeft color={isSeniorMode ? Colors.dark.text : Colors.light.text} size={isSeniorMode ? 32 : 28} />
        </TouchableOpacity>
        <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
          Karma Rewards
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* COMING SOON BANNER */}
        <View className="bg-surface border-2 border-secondary rounded-2xl dark:rounded-senior p-5 mb-8 flex-row shadow-sm">
          <View className="mr-4 mt-1">
            <Info color={Colors.light.secondary} size={isSeniorMode ? 32 : 28} />
          </View>
          <View className="flex-1">
            <Text className={`text-text font-sans font-bold mb-2 ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
              Coming Soon!
            </Text>
            <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-base leading-6' : 'text-sm leading-5'}`}>
              We are currently partnering with local businesses to bring you real-world rewards for helping your neighborhood. Keep earning Karma to unlock these tiers when they launch!
            </Text>
          </View>
        </View>

        {/* CURRENT POINTS DISPLAY */}
        <View className="flex-row items-center justify-between bg-surface border border-border dark:border-senior p-5 rounded-2xl dark:rounded-senior shadow-sm mb-10">
          <View className="flex-row items-center">
            <View className="bg-surface p-3 rounded-full mr-4">
              <Award color={primaryIconColor} size={isSeniorMode ? 28 : 24} />
            </View>
            <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>Your Balance:</Text>
          </View>
          <Text className={`font-sans font-extrabold text-primary ${isSeniorMode ? 'text-3xl' : 'text-3xl'}`}>
            {currentKarma} <Text className={`text-text-muted text-base`}>pts</Text>
          </Text>
        </View>

        {/* DEMO DISCLAIMER */}
        <Text className={`text-center text-text-muted font-sans italic mb-10 px-4 ${isSeniorMode ? 'text-base' : 'text-xs'}`}>
          * Note: The rewards listed below are examples for demonstration purposes.
        </Text>

        {/* TIMELINE */}
        <View className="pl-4">
          {REWARDS_TRACK.map((reward, index) => {
            const isUnlocked = currentKarma >= reward.points;
            const isLast = index === REWARDS_TRACK.length - 1;
            
            return (
              <View key={reward.id} className="relative flex-row mb-8">
                
                {/* THE VERTICAL TIMELINE LINE */}
                {!isLast && (
                  <View 
                    className={`absolute left-[15px] top-[40px] bottom-[-40px] w-1 rounded-full ${
                      isUnlocked ? 'bg-primary' : 'bg-border dark:bg-senior'
                    }`} 
                  />
                )}

                {/* THE TIMELINE NODE (Circle Icon) */}
                <View 
                  className={`w-8 h-8 rounded-full items-center justify-center border-4 border-background z-10 ${
                    isUnlocked ? 'bg-primary' : 'bg-surface border-border dark:border-senior'
                  }`}
                >
                  {isUnlocked ? (
                    <CheckCircle color="#FFFFFF" size={16} />
                  ) : (
                    <Lock color={Colors.light.tabIconDefault} size={14} />
                  )}
                </View>

                {/* THE REWARD CARD */}
                <View className={`flex-1 ml-6 bg-surface p-5 rounded-2xl dark:rounded-senior border shadow-sm ${
                  isUnlocked ? 'border-primary dark:border-primary opacity-100' : 'border-border dark:border-senior opacity-60'
                }`}>
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 pr-2">
                      <Text className={`font-sans font-bold ${isUnlocked ? 'text-text' : 'text-text-muted'} ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
                        {reward.title}
                      </Text>
                    </View>
                    <View className={`px-2 py-1 rounded-lg ${isUnlocked ? 'bg-background border border-primary dark:border-senior' : 'bg-background border border-border dark:border-senior'}`}>
                      <Text className={`font-sans font-bold ${isUnlocked ? 'text-primary' : 'text-text-muted'} ${isSeniorMode ? 'text-sm' : 'text-xs'}`}>
                        {reward.points} pts
                      </Text>
                    </View>
                  </View>
                  
                  <Text className={`font-sans ${isUnlocked ? 'text-text-muted' : 'text-text-muted'} ${isSeniorMode ? 'text-base' : 'text-sm'}`}>
                    {reward.description}
                  </Text>

                  {/* UNLOCKED BADGE (Optional flair for unlocked items) */}
                  {isUnlocked && (
                    <View className="flex-row items-center mt-4">
                      <Gift color={primaryIconColor} size={16} className="mr-2" />
                      <Text className="text-primary font-sans font-bold text-sm">Unlocked - Coming Soon!</Text>
                    </View>
                  )}
                </View>

              </View>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}