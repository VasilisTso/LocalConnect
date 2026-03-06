import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { ShieldAlert, Info } from 'lucide-react-native';
import Colors from '@/constants/Colors';

export default function AdaptiveAlert() {
  const { alertState, hideAlert, isSeniorMode } = useAppStore();

  if (!alertState.visible) return null;

  const primaryColor = isSeniorMode ? Colors.dark.primary : Colors.light.primary;
  const errorColor = isSeniorMode ? Colors.dark.error : Colors.light.error;
  
  const isDestructive = alertState.buttons.some(b => b.style === 'destructive');

  return (
    <Modal
      transparent
      animationType="fade"
      visible={alertState.visible}
      onRequestClose={hideAlert}
    >
      <View className="flex-1 justify-center items-center bg-black/60 px-6">
        <View className="w-full max-w-sm bg-surface rounded-2xl dark:rounded-senior border border-border dark:border-senior dark:border-border p-6 shadow-2xl">
          
          <View className="flex-row items-center mb-4">
            {isDestructive ? (
              <ShieldAlert color={errorColor} size={isSeniorMode ? 32 : 28} className="mr-3" />
            ) : (
              <Info color={primaryColor} size={isSeniorMode ? 32 : 28} className="mr-3" />
            )}
            <Text className={`flex-1 ml-2 text-text font-sans font-bold ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
              {alertState.title}
            </Text>
          </View>

          <Text className={`text-text-muted font-sans mb-8 ${isSeniorMode ? 'text-lg leading-7' : 'text-base leading-6'}`}>
            {alertState.message}
          </Text>

          <View className={`w-full mt-2 gap-3 ${isSeniorMode ? 'flex-col-reverse' : 'flex-row justify-end'}`}>
            {alertState.buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestruct = button.style === 'destructive';
              
              let buttonClass = "bg-primary dark:bg-primary";
              let textClass = "text-on-primary dark:text-white";
              
              if (isCancel) {
                buttonClass = "bg-transparent border-2 border-border dark:border-border";
                textClass = "text-text font-semibold";
              } else if (isDestruct) {
                buttonClass = "bg-error dark:bg-error";
                textClass = "text-white";
              }

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.7}
                  onPress={() => {
                    hideAlert(); 
                    if (button.onPress) button.onPress(); 
                  }}
                  className={`px-5 py-3 dark:py-4 rounded-xl dark:rounded-senior items-center justify-center ${
                    isSeniorMode && !isCancel ? 'border-2 dark:border-senior dark:border-border' : ''
                  } ${buttonClass} ${isSeniorMode ? 'w-full' : ''}`}
                  style={!isSeniorMode ? { minWidth: 100 } : undefined}
                >
                  <Text className={`font-sans font-bold text-center ${textClass} ${isSeniorMode ? 'text-xl' : 'text-base'}`}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

        </View>
      </View>
    </Modal>
  );
}