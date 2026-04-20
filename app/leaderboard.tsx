import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, User as UserIcon, Trophy, Medal } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

import Colors from '@/constants/Colors';

interface Leader {
  id: string;
  username: string | null;
  avatar_url: string | null;
  karma_points: number;
  rank?: number;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { session, isSeniorMode } = useAppStore();
  
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [currentUserData, setCurrentUserData] = useState<Leader | null>(null);
  const [loading, setLoading] = useState(true);

  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;

  useEffect(() => {
    async function fetchLeaderboard() {
      if (!session?.user?.id) return;

      try {
        // Fetch Top 10 Users
        const { data: topUsers, error: topError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, karma_points')
          .order('karma_points', { ascending: false })
          .limit(10);

        if (topError) throw topError;

        // Assign ranks to top 10
        const rankedTopUsers = (topUsers || []).map((user, index) => ({
          ...user,
          rank: index + 1
        }));
        
        setLeaders(rankedTopUsers);

        // Check if current user is in the Top 10
        const isUserInTop10 = rankedTopUsers.some(u => u.id === session.user.id);

        // If not in Top 10, fetch their specific data and calculate rank
        if (!isUserInTop10) {
          const { data: myProfile, error: myError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, karma_points')
            .eq('id', session.user.id)
            .single();

          if (myProfile && !myError) {
            // Count how many people have MORE karma than the current user
            const { count } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .gt('karma_points', myProfile.karma_points || 0);

            setCurrentUserData({
              ...myProfile,
              rank: (count || 0) + 1
            });
          }
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [session?.user?.id]);

  // Helper to get Medals & Colors for Top 3
  const getRankStyling = (rank: number) => {
    switch (rank) {
      case 1: return { color: '#F59E0B', bg: 'bg-[#F59E0B]/10', border: 'border-[#F59E0B]' }; // Gold
      case 2: return { color: '#9CA3AF', bg: 'bg-[#9CA3AF]/10', border: 'border-[#9CA3AF]' }; // Silver
      case 3: return { color: '#B45309', bg: 'bg-[#B45309]/10', border: 'border-[#B45309]' }; // Bronze
      default: return { color: isSeniorMode ? Colors.dark.text : Colors.light.text, bg: 'bg-surface', border: 'border-border dark:border-senior' };
    }
  };

  const LeaderRow = ({ user, isCurrentUser = false }: { user: Leader, isCurrentUser?: boolean }) => {
    const styling = getRankStyling(user.rank || 4);
    
    // Highlight the current user differently if they are pinned at the bottom
    const rowClasses = isCurrentUser 
      ? `bg-primary p-4 rounded-2xl flex-row items-center mb-2 shadow-lg border-2 dark:border-primary border-background`
      : `${styling.bg} border-2 ${styling.border} p-4 rounded-2xl mb-3 flex-row items-center shadow-sm dark:shadow-none`;

    const textColor = isCurrentUser ? 'text-white' : 'text-text';
    const subTextColor = isCurrentUser ? 'text-white opacity-80' : 'text-text-muted';

    return (
      <View className={rowClasses}>
        {/* RANK NUMBER / MEDAL */}
        <View className="w-10 items-center justify-center mr-2">
          {user.rank === 1 ? <Trophy color={styling.color} size={isSeniorMode ? 28 : 24} /> :
           user.rank === 2 ? <Medal color={styling.color} size={isSeniorMode ? 28 : 24} /> :
           user.rank === 3 ? <Medal color={styling.color} size={isSeniorMode ? 28 : 24} /> :
           <Text className={`${textColor} font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
             #{user.rank}
           </Text>}
        </View>

        {/* AVATAR */}
        <View className="mr-4">
          {user.avatar_url ? (
            <Image 
              source={{ uri: user.avatar_url }} 
              style={{ width: isSeniorMode ? 56 : 48, height: isSeniorMode ? 56 : 48, borderRadius: isSeniorMode ? 28 : 24 }} 
            />
          ) : (
            <View 
              className={`border border-border items-center justify-center ${isCurrentUser ? 'bg-white/20' : 'bg-background'}`} 
              style={{ width: isSeniorMode ? 56 : 48, height: isSeniorMode ? 56 : 48, borderRadius: isSeniorMode ? 28 : 24 }}
            >
              <UserIcon color={isCurrentUser ? '#FFFFFF' : primaryIconColor} size={isSeniorMode ? 28 : 24} />
            </View>
          )}
        </View>

        {/* USERNAME */}
        <View className="flex-1">
          <Text className={`${textColor} font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`} numberOfLines={1}>
            {user.username || 'Neighbor'} {isCurrentUser && '(You)'}
          </Text>
        </View>

        {/* SCORE */}
        <View className="items-end pl-2">
          <Text className={`font-sans font-extrabold ${isCurrentUser ? 'text-white' : ''} ${isSeniorMode ? 'text-2xl' : 'text-xl'}`} style={!isCurrentUser ? { color: styling.color } : {}}>
            {user.karma_points || 0}
          </Text>
          <Text className={`${subTextColor} font-sans font-bold text-xs`}>Karma</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* HEADER */}
      <View className="flex-row items-center px-6 pt-4 pb-4 border-b border-border dark:border-senior dark:border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 -ml-2 active:opacity-70">
          <ArrowLeft color={isSeniorMode ? Colors.dark.text : Colors.light.text} size={isSeniorMode ? 32 : 28} />
        </TouchableOpacity>
        <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
          Local Heroes
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={primaryIconColor} />
        </View>
      ) : (
        <View className="flex-1">
          <ScrollView 
            contentContainerStyle={{ padding: 24, paddingBottom: currentUserData ? 100 : 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* TOP 3 HIGHLIGHT TEXT */}
            <View className="mb-6 items-center">
              <Text className={`text-text font-sans font-extrabold text-center mb-1 ${isSeniorMode ? 'text-3xl' : 'text-2xl'}`}>
                Community Leaders
              </Text>
              <Text className={`text-text-muted font-sans text-center ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
                The neighbors making the biggest impact.
              </Text>
            </View>

            {/* LEADERBOARD LIST */}
            {leaders.map((leader) => (
              <LeaderRow 
                key={leader.id} 
                user={leader} 
                // Highlight them securely if they are in the top 10
                isCurrentUser={leader.id === session?.user?.id && !currentUserData} 
              />
            ))}
          </ScrollView>

          {/* STICKY CURRENT USER BANNER (If not in top 10) */}
          {currentUserData && (
            <View className="absolute bottom-6 left-6 right-6">
              <View className="items-center mb-2">
                <View className="bg-background px-3 py-1 rounded-full border border-border dark:border-senior shadow-sm">
                  <Text className={`text-text-muted font-sans font-bold text-xs`}>Your Rank</Text>
                </View>
              </View>
              <LeaderRow user={currentUserData} isCurrentUser={true} />
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}