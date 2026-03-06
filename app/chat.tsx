import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';
import { StatusBar } from 'expo-status-bar';
import { X, Bot } from 'lucide-react-native';

import Colors from '@/constants/Colors';

// THE RULE-BASED ENGINE: Predetermined answers for local parsing
const QA_DATABASE: Record<string, string> = {
  "How do I earn Karma?": "You earn 10 Karma Points every time you help a neighbor! Just click the 'Help' button on any open task in the feed.",
  "How do I edit a task?": "Find your task on the Feed and click the small Pencil icon. You can only edit tasks that you created yourself.",
  "Is my location private?": "Yes! We use 'Privacy by Design'. We only use general neighborhood areas (like 'Central Square'), never your exact GPS coordinates.",
  "Contact Human Support": "You can reach our neighborhood admins at support@localconnect.gr or call 112 in emergencies.",
  "How to enable Senior Mode": "Go to your profile and toggle the switch",
};

const MAIN_MENU = Object.keys(QA_DATABASE);

// Shape of a Chat Message
interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  options?: string[]; // Buttons to display under the message
}

export default function ChatScreen() {
  const router = useRouter();
  const { isSeniorMode } = useAppStore();
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize the chat with the bot's greeting and the Main Menu
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Hi there! I am the LocalConnect Helper. What can I assist you with today?',
      options: MAIN_MENU,
    }
  ]);

  // Auto-scroll to the bottom when new messages appear
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Handle Menu Button Clicks
  const handleSelectOption = (option: string) => {
    // Log the user's choice to the chat window
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: option };
    
    // Remove the buttons from the previous bot message so the chat history looks clean
    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1].options = [];
      return [...updated, userMsg];
    });

    // The Bot's "Thinking" delay (500ms makes it feel conversational)
    setTimeout(() => {
      if (option === 'Yes, show menu') {
        setMessages(prev => [
          ...prev, 
          { id: Date.now().toString(), sender: 'bot', text: 'Here are your options:', options: MAIN_MENU }
        ]);
      } else if (option === 'No, close chat') {
        router.back();
      } else {
        // Look up the answer in our local dictionary!
        const answer = QA_DATABASE[option] || "I'm sorry, I don't have an answer for that.";
        
        setMessages(prev => [
          ...prev, 
          { id: Date.now().toString(), sender: 'bot', text: answer },
          { 
            id: (Date.now() + 1).toString(), 
            sender: 'bot', 
            text: 'Do you need help with anything else?', 
            options: ['Yes, show menu', 'No, close chat'] 
          }
        ]);
      }
    }, 500); 
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar style={isSeniorMode ? 'dark' : 'light'} />
      
      {/* HEADER */}
      <View className="flex-row justify-between items-center p-6 pt-16 border-b border-border dark:border-senior dark:border-border bg-surface">
        <View className="flex-row items-center">
          <View className="bg-primary dark:bg-primary p-3 rounded-full mr-3 border border-transparent dark:border-senior dark:border-primary">
            <Bot color="#FFFFFF" size={isSeniorMode ? 32 : 24} />
          </View>
          <View>
            <Text className={`font-sans font-bold text-text ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>Help Center</Text>
            <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>AI Assistant</Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="bg-background border-2 border-border dark:border-senior dark:border-border p-3 rounded-full dark:rounded-senior active:opacity-70"
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <X color={isSeniorMode ? Colors.dark.text : Colors.light.text} size={isSeniorMode ? 28 : 24} />
        </TouchableOpacity>
      </View>

      {/* CHAT WINDOW */}
      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 px-5 py-6"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <View key={msg.id} className={`mb-6 ${isBot ? 'items-start' : 'items-end'}`}>
              
              {/* Message Bubble */}
              <View 
                className={`max-w-[85%] rounded-3xl dark:rounded-senior p-5 border-2 dark:border-senior ${
                  isBot 
                    ? 'bg-surface border-border dark:border-border rounded-tl-sm' 
                    : 'bg-primary border-primary dark:bg-primary dark:border-primary rounded-tr-sm'
                }`}
              >
                <Text 
                  className={`font-sans ${
                    isBot ? 'text-text' : 'text-on-primary dark:text-white'
                  } ${isSeniorMode ? 'text-lg leading-7' : 'text-base leading-6'}`}
                >
                  {msg.text}
                </Text>
              </View>

              {/* Interactive Menu Buttons (Only appear on the latest bot message) */}
              {msg.options && msg.options.length > 0 && (
                <View className="mt-4 w-full items-start pl-2">
                  {msg.options.map((opt, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleSelectOption(opt)}
                      activeOpacity={0.7}
                      className="bg-background border-2 border-primary dark:border-senior dark:border-primary px-5 py-4 rounded-full dark:rounded-senior mb-3 shadow-sm"
                    >
                      <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-lg' : 'text-base'}`}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        {/* Padding at the bottom so it doesn't hug the edge */}
        <View className="h-10" /> 
      </ScrollView>
    </View>
  );
}