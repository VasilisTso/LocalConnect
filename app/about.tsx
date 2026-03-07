import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, HeartHandshake, GraduationCap, ShieldCheck, Heart, FileText, ChevronRight, Activity } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import Colors from '@/constants/Colors';

export default function AboutScreen() {
  const router = useRouter();
  const { isSeniorMode } = useAppStore();

  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
  const mutedIconColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  // Placeholder functions for legal documents
  const openLink = (url: string) => {
    console.log("Opening link:", url);
  };

  // Reusable component for legal links
  const LegalRow = ({ icon: Icon, title, isLast = false }: any) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      className={`flex-row items-center justify-between py-4 px-5 bg-surface ${!isLast ? 'border-b border-border dark:border-senior/50' : ''}`}
      onPress={() => openLink('https://example.com')}
    >
      <View className="flex-row items-center">
        <Icon color={mutedIconColor} size={isSeniorMode ? 24 : 20} className="mr-4" />
        <Text className={`text-text ml-2 font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-base'}`}>
          {title}
        </Text>
      </View>
      <ChevronRight color={mutedIconColor} size={isSeniorMode ? 24 : 20} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* HEADER */}
      <View className="flex-row items-center px-6 pt-4 pb-4 border-b border-border dark:border-senior dark:border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-2 p-2 -ml-2 active:opacity-70">
          <ArrowLeft color={isSeniorMode ? Colors.dark.text : Colors.light.text} size={isSeniorMode ? 32 : 28} />
        </TouchableOpacity>
        <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
          About
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* HERO LOGO & VERSION */}
        <View className="items-center mb-10 mt-6">
          <View className="bg-primary p-5 rounded-3xl mb-5 shadow-sm">
            <HeartHandshake color="#FFFFFF" size={isSeniorMode ? 64 : 56} />
          </View>
          <Text className={`text-text font-sans font-extrabold tracking-tight mb-1 ${isSeniorMode ? 'text-4xl' : 'text-3xl'}`}>
            LocalConnect
          </Text>
          <Text className={`text-text-muted font-sans font-bold ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
            Version 1.3.0
          </Text>
        </View>

        {/* MISSION & THESIS STATEMENT */}
        <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
          Our Mission
        </Text>
        <View className="bg-surface rounded-2xl p-6 mb-8 border border-border dark:border-senior dark:border-border shadow-sm">
          <Text className={`text-text-muted font-sans mb-4 ${isSeniorMode ? 'text-lg leading-7' : 'text-base leading-6'}`}>
            LocalConnect is designed to bring neighborhoods closer together through mutual aid, trust, and community support. 
          </Text>
          <View className="flex-row items-center bg-background p-4 rounded-xl border border-secondary">
            <GraduationCap color={isSeniorMode ? Colors.dark.secondary : Colors.light.secondary} size={isSeniorMode ? 28 : 24} className="mr-3" />
            <Text className={`flex-1 ml-2 text-secondary font-sans font-bold ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
              Developed as an academic thesis project focusing on Human-Centric UI and spatial adaptivity.
            </Text>
          </View>
        </View>

        {/* CORE PILLARS (Highlighting your Thesis features) */}
        <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
          Core Technologies
        </Text>
        <View className="bg-surface rounded-2xl p-2 mb-8 border border-border dark:border-senior dark:border-border shadow-sm">
          
          <View className="flex-row items-center p-4 border-b border-border dark:border-senior/50">
            <View className="bg-surface p-3 rounded-full mr-4">
              <Activity color={primaryIconColor} size={isSeniorMode ? 24 : 20} />
            </View>
            <View className="flex-1">
              <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-base'}`}>Adaptive Engine</Text>
              <Text className={`text-text-muted font-sans mt-0.5 ${isSeniorMode ? 'text-base' : 'text-xs'}`}>Feeds adapt to mobility and interests.</Text>
            </View>
          </View>

          <View className="flex-row items-center p-4 border-b border-border dark:border-senior/50">
            <View className="bg-surface p-3 rounded-full mr-4">
              <HeartHandshake color={primaryIconColor} size={isSeniorMode ? 24 : 20} />
            </View>
            <View className="flex-1">
              <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-base'}`}>Accessibility First</Text>
              <Text className={`text-text-muted font-sans mt-0.5 ${isSeniorMode ? 'text-base' : 'text-xs'}`}>Built-in Senior Mode for high legibility.</Text>
            </View>
          </View>

          <View className="flex-row items-center p-4">
            <View className="bg-surface p-3 rounded-full mr-4">
              <ShieldCheck color={primaryIconColor} size={isSeniorMode ? 24 : 20} />
            </View>
            <View className="flex-1">
              <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-base'}`}>Privacy by Design</Text>
              <Text className={`text-text-muted font-sans mt-0.5 ${isSeniorMode ? 'text-base' : 'text-xs'}`}>GPS fuzzing protects exact addresses.</Text>
            </View>
          </View>

        </View>

        {/* LEGAL LINKS */}
        <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
          Legal
        </Text>
        <View className="bg-surface rounded-2xl border border-border dark:border-senior dark:border-border overflow-hidden shadow-sm mb-12">
          <LegalRow icon={FileText} title="Terms of Service" />
          <LegalRow icon={ShieldCheck} title="Privacy Policy" isLast />
        </View>

        {/* FOOTER */}
        <View className="items-center justify-center opacity-60 mt-4">
          {/* NEW: Tech Stack Listing */}
          <Text className={`text-text-muted font-sans font-semibold mb-1 text-center px-4 ${isSeniorMode ? 'text-sm' : 'text-xs'}`}>
            Powered by
          </Text>
          <Text className={`text-text-muted font-sans text-center px-4 mb-4 ${isSeniorMode ? 'text-sm leading-5' : 'text-[11px] leading-4'}`}>
            React Native • Expo • Supabase • TailwindCSS
          </Text>

          <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-sm' : 'text-[10px]'}`}>
            © {new Date().getFullYear()} LocalConnect. All rights reserved.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}