import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, LifeBuoy, Mail, MessageCircle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import Colors from '@/constants/Colors';

// FAQ Data based on our
const FAQS = [
  {
    id: 1,
    question: "How do I request help from someone?",
    answer: "Go to the Home or Feed tab and tap the '+' (Create Task) button. Fill out a title, description, and select a category. If you want, you can also add a due date and private instructions for whoever helps you."
  },
  {
    id: 2,
    question: "What are Karma Points?",
    answer: "Karma Points are our way of rewarding good neighbors! You earn 10 points every time you successfully complete a task and help someone out. Higher points unlock special badges like 'Local Hero'."
  },
  {
    id: 3,
    question: "Is my home address public?",
    answer: "No. LocalConnect uses 'Location Fuzzing'. We only show a general 1km radius to the community. Your exact address is only shared with the specific neighbor you explicitly accept to help you."
  },
  {
    id: 4,
    question: "What is Senior Mode?",
    answer: "Senior Mode is an accessibility feature. When turned on, the app uses larger text, higher contrast colors, and displays quick-access emergency numbers (like 112 and 100) directly on your profile."
  }
];

export default function SupportScreen() {
  const router = useRouter();
  const { isSeniorMode } = useAppStore();
  
  // State to track which FAQ is currently open
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
  const mutedIconColor = isSeniorMode ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault;

  // Opens the device's default email app pre-filled with support info
  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@localconnect.app?subject=Need%20Help%20with%20LocalConnect');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* HEADER */}
      <View className="flex-row items-center px-6 pt-4 pb-4 border-b border-border dark:border-senior dark:border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-2 p-2 -ml-2 active:opacity-70">
          <ArrowLeft color={isSeniorMode ? Colors.dark.text : Colors.light.text} size={isSeniorMode ? 32 : 28} />
        </TouchableOpacity>
        <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
          Help & Support
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* HERO SECTION */}
        <View className="items-center mb-10 mt-4">
          <View className="bg-background p-5 rounded-full mb-4 dark:bg-primary/20">
            <LifeBuoy color={primaryIconColor} size={isSeniorMode ? 56 : 48} />
          </View>
          <Text className={`text-text font-sans font-bold text-center mb-2 ${isSeniorMode ? 'text-3xl' : 'text-2xl'}`}>
            How can we help?
          </Text>
          <Text className={`text-text-muted font-sans text-center px-4 ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
            Browse our frequently asked questions or contact our neighborhood support team.
          </Text>
        </View>

        {/* FAQ Section */}
        <View className="mb-10">
          <View className="flex-row items-center mb-4">
            <BookOpen color={primaryIconColor} size={isSeniorMode ? 28 : 24} className="mr-3" />
            <Text className={`text-text ml-2 font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
              Frequently Asked Questions
            </Text>
          </View>

          <View className="bg-surface rounded-2xl border border-border dark:border-senior overflow-hidden shadow-sm">
            {FAQS.map((faq, index) => {
              const isExpanded = expandedId === faq.id;
              const isLast = index === FAQS.length - 1;

              return (
                <View key={faq.id} className={!isLast ? 'border-b border-border dark:border-senior/50' : ''}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => setExpandedId(isExpanded ? null : faq.id)}
                    className="flex-row items-center justify-between p-5"
                  >
                    <Text className={`flex-1 text-text font-sans font-bold pr-4 ${isSeniorMode ? 'text-xl' : 'text-base'}`}>
                      {faq.question}
                    </Text>
                    {isExpanded ? (
                      <ChevronUp color={mutedIconColor} size={isSeniorMode ? 24 : 20} />
                    ) : (
                      <ChevronDown color={mutedIconColor} size={isSeniorMode ? 24 : 20} />
                    )}
                  </TouchableOpacity>

                  {/* Expandable Answer Content */}
                  {isExpanded && (
                    <View className="px-5 pb-5 pt-1">
                      <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-lg leading-7' : 'text-base leading-6'}`}>
                        {faq.answer}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* CONTACT BUTTONS */}
        <Text className={`text-text font-sans font-bold mb-4 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
          Still need help?
        </Text>
        
        <TouchableOpacity 
          onPress={handleEmailSupport}
          activeOpacity={0.8}
          className="bg-primary dark:bg-primary py-4 px-5 rounded-xl dark:rounded-senior items-center flex-row justify-center shadow-sm mb-4"
        >
          <Mail color="#FFFFFF" size={isSeniorMode ? 24 : 20} className="mr-3" />
          <Text className={`text-white ml-2 font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
            Email Support
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          activeOpacity={0.8}
          className="bg-surface py-4 px-5 rounded-xl border border-border dark:border-senior items-center flex-row justify-center shadow-sm"
        >
          <MessageCircle color={primaryIconColor} size={isSeniorMode ? 24 : 20} className="mr-3" />
          <Text className={`text-text ml-2 font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'}`}>
            Community Guidelines
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}