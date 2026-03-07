import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, HelpCircle } from 'lucide-react-native';

export default function SupportScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-6 pt-4 pb-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-2 p-2 -ml-2">
          <ArrowLeft color="#1A1826" size={28} />
        </TouchableOpacity>
        <Text className="font-sans font-bold text-xl text-text">Help & Support</Text>
      </View>
      <View className="flex-1 items-center justify-center p-6">
        <HelpCircle color="#9CA3AF" size={64} className="mb-4 opacity-50" />
        <Text className="font-sans text-lg text-text-muted text-center">Support articles coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}