import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  KeyboardAvoidingView,
  TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';
import { StatusBar } from 'expo-status-bar';
import { X, Bot, Send } from 'lucide-react-native';

import Colors from '@/constants/Colors';

// THE RULE-BASED ENGINE: Predetermined answers for local parsing and instant answers
const QA_DATABASE: Record<string, Record<string, string>> = {
  "App Features": {
    "How do the badges work?": "You earn badges by completing tasks and gaining Karma! You start as a 'New Neighbor' and can level up to 'Active Helper' and eventually 'Local Hero'.",
    "How does the review system work?": "When you complete a task for someone, they can rate your help from 1 to 5 stars. Your average rating shows up on your profile for the community to see.",
    "How does my feed use tags?": "Your Smart Feed looks at the hobbies/interests you selected during onboarding (like 'Pets' or 'Tools') and pushes tasks with those tags to the top of your list!",
    "How do I earn Karma?": "You earn 10 Karma Points every time you successfully complete a task and help a neighbor out."
  },
  "Privacy & Safety": {
    "Is my location (1km) really private?": "Yes! We use 'Location Fuzzing'. The map only shows a general 1km radius circle to the public. Your exact home address is never shown on the public map.",
    "Are private details really private?": "Absolutely. Any text you put in the 'Private Instructions' box is completely hidden from the public feed. It is ONLY revealed to the specific neighbor you accept to help you.",
    "Will users know my other info?": "No. Neighbors only see your username, your badge/karma, and your average rating. We never share your email or phone number automatically."
  },
  "Account & Tasks": {
    "How can I edit my task?": "Go to the Feed, find your open task, and tap the small Pencil icon. Note: You can only edit tasks that are still 'Open'.",
    "How do I enable Senior Mode?": "Go to the Profile tab, tap 'Edit Profile', and toggle 'Senior Mode'. It will instantly increase text size and color contrast!",
  },
  "Support": {
    "Contact Human Support": "You can reach our neighborhood admins at support@localconnect.app. If it is a real-world emergency, please call 112."
  }
};

const CATEGORIES = Object.keys(QA_DATABASE);

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

  // input state for the AI integration
  const [inputText, setInputText] = useState('');

  // Initialize the chat with the bot's greeting and the Main Menu
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Hi there! I am your LocalConnect Assistant. What do you need help with?',
      options: CATEGORIES,
    }
  ]);

  const primaryIconColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;

  // Auto-scroll to the bottom when new messages appear
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Handle the hardcoded rule-based buttons
  const handleSelectOption = (option: string) => {
    // Log the user's choice to the chat window
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: option };
    
    // Remove the buttons from the previous bot message so the chat history looks clean
    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1].options = [];
      return [...updated, userMsg];
    });

    // TThinking delay (400ms makes it feel conversational)
    setTimeout(() => {
      // Did they click a Category? (Show Questions)
      if (CATEGORIES.includes(option)) {
        const questions = Object.keys(QA_DATABASE[option]);
        setMessages(prev => [
          ...prev, 
          { id: Date.now().toString(), sender: 'bot', text: `Here are common questions about ${option}:`, options: questions }
        ]);
      } 
      // Did they click Back to Menu?
      else if (option === 'Back to main menu') {
        setMessages(prev => [
          ...prev, 
          { id: Date.now().toString(), sender: 'bot', text: 'Here are the categories:', options: CATEGORIES }
        ]);
      }
      // Did they click a specific Question? (Show Answer)
      else {
        // Find the answer by searching all categories
        let answer = "I'm sorry, I couldn't find the answer.";
        for (const cat in QA_DATABASE) {
          if (QA_DATABASE[cat][option]) {
            answer = QA_DATABASE[cat][option];
            break;
          }
        }
        
        setMessages(prev => [
          ...prev, 
          { id: Date.now().toString(), sender: 'bot', text: answer },
          { 
            id: (Date.now() + 1).toString(), 
            sender: 'bot', 
            text: 'Need help with anything else?', 
            options: ['Back to main menu'] 
          }
        ]);
      }
    }, 400); 
  };

  // Handle typed messages (AI integration)
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: inputText.trim() };
    
    // Clear old buttons and add user text
    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1].options = [];
      return [...updated, userMsg];
    });

    setInputText('');

    // DUMMY AI RESPONSE (TODO replace with REAL AI next)
    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { 
          id: Date.now().toString(), 
          sender: 'bot', 
          text: "I am an AI, but I haven't been connected to my brain yet! Try using the buttons above for now.", 
          options: ['Back to main menu'] 
        }
      ]);
    }, 1000);
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
            <Text className={`text-text-muted font-sans ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>Smart Assistant</Text>
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

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* CHAT WINDOW */}
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 px-5 py-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

                {/* Interactive Menu Buttons */}
                {msg.options && msg.options.length > 0 && (
                  <View className="mt-4 w-full items-start pl-2">
                    {msg.options.map((opt, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleSelectOption(opt)}
                        activeOpacity={0.7}
                        className="bg-background border-2 border-primary dark:border-senior dark:border-primary px-5 py-3.5 rounded-full dark:rounded-senior mb-3 shadow-sm"
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
        </ScrollView>

        {/* AI TEXT INPUT FOOTER */}
        <View className="p-4 bg-surface border-t border-border dark:border-senior dark:border-border flex-row items-end pb-8">
          <TextInput
            className={`flex-1 bg-background border-2 border-border dark:border-senior rounded-3xl dark:rounded-senior px-5 pt-4 pb-4 mr-3 text-text font-sans ${isSeniorMode ? 'text-lg' : 'text-base'}`}
            placeholder="Ask a custom question..."
            placeholderTextColor={Colors.light.tabIconDefault}
            multiline
            maxLength={200}
            value={inputText}
            onChangeText={setInputText}
            style={{ maxHeight: 120 }} // Prevents it from growing too tall
          />
          <TouchableOpacity 
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
            activeOpacity={0.7}
            className={`p-4 rounded-full border-2 dark:border-senior dark:rounded-senior ${
              inputText.trim() 
                ? 'bg-primary border-primary dark:bg-primary dark:border-primary' 
                : 'bg-background border-border dark:border-border opacity-50'
            }`}
          >
            <Send color={inputText.trim() ? '#FFFFFF' : Colors.light.tabIconDefault} size={isSeniorMode ? 28 : 24} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}