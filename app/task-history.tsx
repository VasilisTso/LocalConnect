import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { ArrowLeft, CheckCircle, Calendar, User as UserIcon, ArrowDownUp } from 'lucide-react-native';

import Colors from '@/constants/Colors';

// Helper to format the date beautifully
function formatCompletedDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TaskHistoryScreen() {
  const router = useRouter();
  const { session, isSeniorMode } = useAppStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortDescending, setSortDescending] = useState(true);

  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;

  // sorting logic. 
  // copy of the array [...tasks] so we dont accidentally mutate the original React state
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortDescending ? dateB - dateA : dateA - dateB;
  });

  useEffect(() => {
    async function fetchHistory() {
      if (!session?.user?.id) return;

      try {
        // Fetch tasks where the current user was the helper AND it is completed/resolved
        // Note: Change 'resolved' to 'completed' if that is what your DB uses for the status!
        const { data, error } = await supabase
          .from('tasks')
          .select(`
            id,
            title,
            created_at,
            status,
            owner:profiles!user_id(username, avatar_url)
          `)
          .eq('helper_id', session.user.id)
          .in('status', ['resolved', 'completed']) 
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTasks(data || []);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [session?.user?.id]);

  // The UI for a single history card
  const renderTaskCard = ({ item }: { item: any }) => {
    // Safely extract owner data (handling arrays just in case Supabase returns it as one)
    const owner = Array.isArray(item.owner) ? item.owner[0] : item.owner;

    return (
      <View className="bg-surface rounded-2xl dark:rounded-senior p-5 mb-4 border border-border dark:border-senior dark:border-border shadow-sm flex-row items-center">
        
        {/* Left Side: Avatar */}
        <View className="mr-4">
          {owner?.avatar_url ? (
            <Image 
              source={{ uri: owner.avatar_url }} 
              style={{ width: isSeniorMode ? 64 : 50, height: isSeniorMode ? 64 : 50, borderRadius: isSeniorMode ? 32 : 25 }} 
            />
          ) : (
            <View 
              className="bg-background border border-border items-center justify-center" 
              style={{ width: isSeniorMode ? 64 : 50, height: isSeniorMode ? 64 : 50, borderRadius: isSeniorMode ? 32 : 25 }}
            >
              <UserIcon color={primaryIconColor} size={isSeniorMode ? 32 : 24} />
            </View>
          )}
        </View>

        {/* Right Side: Details */}
        <View className="flex-1">
          <Text 
            className={`text-text font-sans font-bold mb-1 ${isSeniorMode ? 'text-xl' : 'text-lg'}`} 
            numberOfLines={1}
          >
            {item.title}
          </Text>
          
          <Text className={`text-text-muted font-sans font-semibold mb-2 ${isSeniorMode ? 'text-base' : 'text-sm'}`}>
            For {owner?.username || 'Neighbor'}
          </Text>

          <View className="flex-row items-center">
            <CheckCircle color={Colors.light.success} size={isSeniorMode ? 16 : 14} className="mr-1.5" />
            <Text className={`text-success ml-1 font-sans font-bold mr-4 ${isSeniorMode ? 'text-sm' : 'text-xs'}`}>
              Completed
            </Text>
            
            <Calendar color={Colors.light.tabIconDefault} size={isSeniorMode ? 16 : 14} className="mr-1.5" />
            <Text className={`text-text-muted ml-1 font-sans font-semibold ${isSeniorMode ? 'text-sm' : 'text-xs'}`}>
              {formatCompletedDate(item.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Custom Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-4 border-b border-border dark:border-senior dark:border-border">
        
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 -ml-2 active:opacity-70">
            <ArrowLeft color={isSeniorMode ? Colors.dark.text : Colors.light.text} size={isSeniorMode ? 32 : 28} />
          </TouchableOpacity>
          <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
            Impact History
          </Text>
        </View>

        {/* SORT BUTTON: Only show it if there are at least 2 tasks to sort */}
        {tasks.length > 1 && (
          <TouchableOpacity 
            onPress={() => setSortDescending(!sortDescending)} 
            className="flex-row items-center bg-surface px-3 py-2 rounded-full border border-border dark:border-senior active:opacity-70 shadow-sm"
          >
            <ArrowDownUp color={primaryIconColor} size={isSeniorMode ? 18 : 16} className="mr-1.5" />
            <Text className={`text-primary font-sans font-bold ${isSeniorMode ? 'text-sm' : 'text-xs'}`}>
              {sortDescending ? 'Newest' : 'Oldest'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={primaryIconColor} />
        </View>
      ) : tasks.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <CheckCircle color={Colors.light.border} size={80} className="mb-4" />
          <Text className={`text-text font-sans font-bold text-center mb-2 ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
            No tasks completed yet
          </Text>
          <Text className={`text-text-muted font-sans text-center ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
            When you help a neighbor and they mark the task as complete, it will appear here!
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskCard}
          contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}