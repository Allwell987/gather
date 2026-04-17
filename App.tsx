// App.tsx
import React, { useEffect, useCallback } from 'react';
import { Alert, AppState, View, StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as Font from 'expo-font';
import NetInfo from '@react-native-community/netinfo';
import type { Session } from '@supabase/supabase-js';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';
import {
  Merriweather_700Bold,
  Merriweather_400Regular_Italic,
} from '@expo-google-fonts/merriweather';
import {
  Lora_700Bold,
  Lora_400Regular_Italic,
} from '@expo-google-fonts/lora';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
} from '@expo-google-fonts/nunito';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from './src/navigation/RootNavigator';
import ToastHost from './src/components/ToastHost';
import {
  flushPendingNotificationNavigation,
  navigationRef,
  tryHandleNotificationNavigation,
} from './src/navigation/navigationRef';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useAuthStore } from './src/store/authStore';
import { useThemeStore } from './src/store/themeStore';
import {
  getAuthFeedbackMessage,
  getAuthParamsFromUrl,
  getSupabaseConfigMessage,
  isSupabaseConfigured,
  isSupportedEmailOtpType,
  supabase,
} from './src/services/supabase';
import { registerForPushNotificationsAsync } from './src/services/notifications';
import { flushOfflineActions } from './src/services/offlineActionQueue';
import { ensureProfileForSession } from './src/services/profile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 2 },
  },
});

export default function App() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  const {
    setUser,
    setSession,
    setIsLoading,
    setAuthFeedback,
    user,
    isOnboarded,
    setPendingVerificationEmail,
  } = useAuthStore();
  const { colors, themeMode } = useThemeStore();

  const canOpenMainScreens = Boolean(user && isOnboarded);

  const syncUserFromSession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setSession(null);
      return;
    }

    try {
      const pushToken = await registerForPushNotificationsAsync();
      const profile = await ensureProfileForSession(session, pushToken);
      setUser(profile);

      setSession(session.access_token ?? null);
      setAuthFeedback(null);
      setPendingVerificationEmail(null);
    } catch (err) {
      console.error('Session sync error:', err);

      Alert.alert(
        'Profile setup issue',
        'We could not finish setting up your profile. Apply the SQL fix in database/fix_profiles_rls.sql and try again.'
      );
    }
  }, [setAuthFeedback, setPendingVerificationEmail, setSession, setUser]);

  const handleAuthLink = useCallback(async (url: string) => {
    const params = getAuthParamsFromUrl(url);

    const handleAuthFailure = (errorCode?: string, errorDescription?: string) => {
      const message = getAuthFeedbackMessage({ errorCode, errorDescription });

      setAuthFeedback({
        code: errorCode,
        message,
      });

      Alert.alert('Verification link issue', message);
    };

    if (params.error_description) {
      console.error('Auth callback error:', params.error_description);
      handleAuthFailure(params.error_code, params.error_description);
      return;
    }

    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) {
        console.error('Code exchange error:', error);
        handleAuthFailure(undefined, error.message);
        return;
      }

      setAuthFeedback(null);
      return;
    }

    if (params.access_token && params.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });

      if (error) {
        console.error('Deep link session error:', error);
        handleAuthFailure(undefined, error.message);
        return;
      }

      setAuthFeedback(null);
      return;
    }

    if (params.token_hash && isSupportedEmailOtpType(params.type)) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: params.token_hash,
        type: params.type,
      });

      if (error) {
        console.error('OTP verification error:', error);
        handleAuthFailure(undefined, error.message);
        return;
      }

      setAuthFeedback(null);
    }
  }, [setAuthFeedback]);

  useEffect(() => {
    // Keep startup resilient so a single font failure does not blank the app forever.
    void Font.loadAsync({
      // Modern fonts (default)
      PlayfairDisplay_400Regular,
      PlayfairDisplay_700Bold,
      PlayfairDisplay_400Regular_Italic,
      PlusJakartaSans_400Regular,
      PlusJakartaSans_500Medium,
      PlusJakartaSans_600SemiBold,
      // Classic fonts
      Merriweather_700Bold,
      Merriweather_400Regular_Italic,
      Nunito_400Regular,
      Nunito_500Medium,
      Nunito_600SemiBold,
      // Elegant fonts
      Lora_700Bold,
      Lora_400Regular_Italic,
      Poppins_400Regular,
      Poppins_500Medium,
      Poppins_600SemiBold,
    })
      .catch((err) => {
        console.error('Font loading error:', err);
      })
      .finally(() => {
        setFontsLoaded(true);
      });

    const bootstrapAuth = async () => {
      try {
        const configMessage = getSupabaseConfigMessage();

        if (!isSupabaseConfigured && configMessage) {
          setAuthFeedback({
            code: 'supabase_not_configured',
            message: configMessage,
          });
          return;
        }

        const initialUrl = await Linking.getInitialURL();

        if (initialUrl) {
          await handleAuthLink(initialUrl);
        }

        const { data: { session } } = await supabase.auth.getSession();
        await syncUserFromSession(session);
      } catch (err) {
        console.error('Session bootstrap error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrapAuth();

    if (!isSupabaseConfigured) {
      return;
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUserFromSession(session);
    });

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleAuthLink(url);
    });

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [handleAuthLink, setAuthFeedback, setIsLoading, syncUserFromSession]);

  // Notification listeners
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const payload = response?.notification.request.content.data;

        if (payload) {
          tryHandleNotificationNavigation(payload, canOpenMainScreens);
        }
      })
      .catch((error) => {
        console.error('Initial notification response error:', error);
      });

    // Handle notification received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(() => {
      // Notification received - handled silently
    });

    // Handle notification response (user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const payload = response.notification.request.content.data;
      tryHandleNotificationNavigation(payload, canOpenMainScreens);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [canOpenMainScreens]);

  useEffect(() => {
    flushPendingNotificationNavigation(canOpenMainScreens);
  }, [canOpenMainScreens]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const flushQueuedChanges = async () => {
      const result = await flushOfflineActions({ userId: user.id });

      if (result.processedCount > 0) {
        await queryClient.invalidateQueries();
      }
    };

    void flushQueuedChanges();

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void flushQueuedChanges();
      }
    });

    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void flushQueuedChanges();
      }
    });

    return () => {
      appStateSubscription.remove();
      networkSubscription();
    };
  }, [user?.id]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer
            ref={navigationRef}
            onReady={() => {
              flushPendingNotificationNavigation(canOpenMainScreens);
            }}
          >
            <ErrorBoundary>
              <View
                style={{ flex: 1, backgroundColor: colors.background }}
                onLayout={onLayoutRootView}
              >
                <StatusBar
                  barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
                  backgroundColor="transparent"
                  translucent
                />
                <RootNavigator />
                <ToastHost />
              </View>
            </ErrorBoundary>
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
