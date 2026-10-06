// src/navigation/AuthNavigator.tsx
import React from 'react';
import { createStackNavigator , CardStyleInterpolators } from '@react-navigation/stack';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import ThemePickerScreen from '../screens/auth/ThemePickerScreen';
import { useAuthStore } from '../store/authStore';
import type { AuthStackParamList } from '../types/navigation';

export type { AuthStackParamList };

const Stack = createStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  const { user, isOnboarded } = useAuthStore();
  const initialRouteName = user && !isOnboarded
    ? 'ThemePicker'
    : 'Onboarding';

  return (
    <Stack.Navigator
      id={undefined}
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 320 } },
          close: { animation: 'timing', config: { duration: 250 } },
        },
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ThemePicker" component={ThemePickerScreen} />
    </Stack.Navigator>
  );
}
