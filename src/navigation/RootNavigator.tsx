// src/navigation/RootNavigator.tsx
import React from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import Animated from 'react-native-reanimated';
import { useAuthStore } from '../store/authStore';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import type { RootStackParamList } from '../types/navigation';
import { BaseColors } from '../constants/theme';

export type { RootStackParamList };

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, isLoading, isOnboarded, isGuest } = useAuthStore();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BaseColors.cream,
        }}
      >
        <LottieView
          source={require('../../assets/animations/loader.json')}
          autoPlay
          loop
          style={{ width: 60, height: 60 }}
        />
      </View>
    );
  }

  return (
    <Animated.View style={{ flex: 1 }}>
      <Stack.Navigator
        id={undefined}
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
          transitionSpec: {
            open: { animation: 'timing', config: { duration: 340 } },
            close: { animation: 'timing', config: { duration: 260 } },
          },
        }}
      >
        {(user && isOnboarded) || isGuest ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </Animated.View>
  );
}
