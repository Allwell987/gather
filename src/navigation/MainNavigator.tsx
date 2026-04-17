// src/navigation/MainNavigator.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineSyncStatus } from '../hooks/useOfflineSyncStatus';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { BaseColors, Typography } from '../constants/theme';
import type {
  MainTabParamList,
  HomeStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
} from '../types/navigation';
import HomeScreen from '../screens/home/HomeScreen';
import TodayScreen from '../screens/today/TodayScreen';
import BibleScreen from '../screens/bible/BibleScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import GroupChatScreen from '../screens/chat/GroupChatScreen';
import CreateGroupScreen from '../screens/chat/CreateGroupScreen';
import GivingScreen from '../screens/giving/GivingScreen';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import ThemePickerScreen from '../screens/auth/ThemePickerScreen';

export type {
  MainTabParamList,
  HomeStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const CommunityStack = createStackNavigator<CommunityStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 320 } },
          close: { animation: 'timing', config: { duration: 220 } },
        },
      }}
    >
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Giving" component={GivingScreen} />
      <HomeStack.Screen name="GroupChat" component={GroupChatScreen} />
    </HomeStack.Navigator>
  );
}

function CommunityStackNavigator() {
  return (
    <CommunityStack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 320 } },
          close: { animation: 'timing', config: { duration: 220 } },
        },
      }}
    >
      <CommunityStack.Screen name="CommunityHome" component={CommunityScreen} />
      <CommunityStack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <CommunityStack.Screen name="EventDetail" component={EventDetailScreen} />
    </CommunityStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 320 } },
          close: { animation: 'timing', config: { duration: 220 } },
        },
      }}
    >
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="ThemePicker" component={ThemePickerScreen} />
    </ProfileStack.Navigator>
  );
}

// Custom tab bar
type TabIconName = 'home-outline' | 'home' | 'calendar-number-outline' | 'calendar-number' | 'book-outline' | 'book' | 'people-outline' | 'people' | 'person-outline' | 'person';
type TabRoute = { key: string; name: string };

const TABS: { label: string; icon: TabIconName; iconActive: TabIconName }[] = [
  { label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { label: 'Today', icon: 'calendar-number-outline', iconActive: 'calendar-number' },
  { label: 'Bible', icon: 'book-outline', iconActive: 'book' },
  { label: 'Community', icon: 'people-outline', iconActive: 'people' },
  { label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

function TabBarItem({
  route,
  index,
  isFocused,
  accentColor,
  textMutedColor,
  cardColor,
  syncTotal,
  navigate,
}: {
  route: TabRoute;
  index: number;
  isFocused: boolean;
  accentColor: string;
  textMutedColor: string;
  cardColor: string;
  syncTotal: number;
  navigate: (name: string) => void;
}) {
  const tab = TABS[index];
  const showSyncBadge = route.name === 'ProfileTab' && syncTotal > 0;
  const badgeLabel = syncTotal > 9 ? '9+' : String(syncTotal);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.tabItem, animatedStyle]}>
      <TouchableOpacity
        onPress={() => {
          scale.value = withSpring(0.85, { stiffness: 200 }, () => {
            scale.value = withSpring(1, { stiffness: 180 });
          });
          navigate(route.name);
        }}
        activeOpacity={0.7}
        accessibilityLabel={tab.label}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
      >
        <View style={styles.iconWrap}>
          <Ionicons
            name={isFocused ? tab.iconActive : tab.icon}
            size={22}
            color={isFocused ? accentColor : textMutedColor}
          />
        </View>
        {showSyncBadge ? (
          <View
            style={[
              styles.syncBadge,
              { backgroundColor: isFocused ? accentColor : BaseColors.gold, borderColor: cardColor },
            ]}
          >
            <Text style={styles.syncBadgeText}>{badgeLabel}</Text>
          </View>
        ) : null}
        <Text style={[
          styles.tabLabel,
          { color: isFocused ? accentColor : textMutedColor }
        ]}>
          {tab.label}
        </Text>
        {isFocused && (
          <View style={[styles.tabDot, { backgroundColor: accentColor }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function CustomTabBar({ state, navigation }: {
  state: { routes: TabRoute[]; index: number };
  navigation: { navigate: (name: string) => void };
}) {
  const insets = useSafeAreaInsets();
  const { theme, colors } = useThemeStore();
  const { user } = useAuthStore();
  const { syncSummary } = useOfflineSyncStatus(user?.id);

  return (
    <View style={styles.tabShell}>
      <View
        style={[
          styles.tabBar,
          {
            paddingBottom: insets.bottom + 8,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        {/* Animated tab indicator */}
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              left: `${(100 / state.routes.length) * state.index}%`,
              width: `${100 / state.routes.length}%`,
              backgroundColor: theme.accent,
            },
          ]}
        />
        {state.routes.map((route, index) => (
          <TabBarItem
            key={route.key}
            route={route}
            index={index}
            isFocused={state.index === index}
            accentColor={theme.accent}
            textMutedColor={colors.textMuted}
            cardColor={colors.card}
            syncTotal={syncSummary.total}
            navigate={navigation.navigate}
          />
        ))}
      </View>
    </View>
  );
}

export default function MainNavigator() {
  return (
    <Animated.View style={{ flex: 1 }}>
      <Tab.Navigator
        id={undefined}
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
        <Tab.Screen name="TodayTab" component={TodayScreen} />
        <Tab.Screen name="BibleTab" component={BibleScreen} />
        <Tab.Screen name="CommunityTab" component={CommunityStackNavigator} />
        <Tab.Screen name="ProfileTab" component={ProfileStackNavigator} />
      </Tab.Navigator>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 4,
    borderRadius: 2,
    zIndex: 1,
  },
  tabShell: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 4,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 28,
  },
  tabLabel: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
  },
  syncBadge: {
    position: 'absolute',
    top: -4,
    right: '30%',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  syncBadgeText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 9,
    color: BaseColors.white,
  },
  tabDot: {
    position: 'absolute',
    top: -6,
    width: 18,
    height: 3,
    borderRadius: 999,
  },
});
