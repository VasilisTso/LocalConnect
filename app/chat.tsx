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
import { X, Bot, User as UserIcon } from 'lucide-react-native';

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
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'dark'} />
      
      {/* HEADER */}
      <View className="flex-row justify-between items-center p-6 mt-10 border-b border-surface-highlight bg-surface">
        <View className="flex-row items-center">
          <View className="bg-primary p-2 rounded-full mr-3">
            <Bot color="#FFFFFF" size={isSeniorMode ? 32 : 24} />
          </View>
          <View>
            <Text className={`font-sans font-bold text-text ${isSeniorMode ? 'text-3xl' : 'text-xl'}`}>Help Center</Text>
            <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-base' : 'text-sm'}`}>AI Assistant</Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="bg-background border border-surface-highlight p-2 rounded-full"
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <X color="#64748B" size={isSeniorMode ? 32 : 24} />
        </TouchableOpacity>
      </View>

      {/* CHAT WINDOW */}
      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 px-4 py-6"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <View key={msg.id} className={`mb-6 ${isBot ? 'items-start' : 'items-end'}`}>
              
              {/* Message Bubble */}
              <View className={`max-w-[85%] rounded-2xl p-4 ${isBot ? 'bg-surface border border-surface-highlight rounded-tl-sm' : 'bg-primary rounded-tr-sm'}`}>
                <Text className={`font-sans ${isBot ? 'text-text' : 'text-white'} ${isSeniorMode ? 'text-xl leading-8' : 'text-base leading-6'}`}>
                  {msg.text}
                </Text>
              </View>

              {/* Interactive Menu Buttons (Only appear on the latest bot message) */}
              {msg.options && msg.options.length > 0 && (
                <View className="mt-4 w-full items-start">
                  {msg.options.map((opt, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleSelectOption(opt)}
                      className="bg-secondary/20 border-2 border-primary px-5 py-3 rounded-full mb-3 shadow-sm"
                    >
                      <Text className={`text-text font-sans font-bold ${isSeniorMode ? 'text-xl' : 'text-base'}`}>
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