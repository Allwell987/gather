// src/types/navigation.ts
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, NavigatorScreenParams, RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};

export type AuthStackParamList = {
  Landing: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  EmailVerification: { email?: string } | undefined;
  ThemePicker: { fromOnboarding: boolean };
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  TodayTab: undefined;
  BibleTab: undefined;
  CommunityTab: NavigatorScreenParams<CommunityStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Giving: undefined;
  GroupChat: { groupId: string; groupName: string };
  ManageRequests: { groupId: string; groupName: string };
};

export type CommunityStackParamList = {
  CommunityHome: undefined;
  CreateGroup: undefined;
  EventDetail: { eventId: string };
  LiveStream: { videoId?: string } | undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  ThemePicker: { fromOnboarding: boolean };
};

export type RootStackNavigationProp = StackNavigationProp<RootStackParamList>;
export type AuthStackNavigationProp = StackNavigationProp<AuthStackParamList>;
export type HomeStackNavigationProp = StackNavigationProp<HomeStackParamList>;
export type CommunityStackNavigationProp = StackNavigationProp<CommunityStackParamList>;
export type ProfileStackNavigationProp = StackNavigationProp<ProfileStackParamList>;

export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;

export type HomeScreenNavigationProp = CompositeNavigationProp<
  HomeStackNavigationProp,
  MainTabNavigationProp
>;

export type CommunityScreenNavigationProp = CompositeNavigationProp<
  CommunityStackNavigationProp,
  MainTabNavigationProp
>;

// Backward-compatible aliases for legacy events screen types.
export type EventsStackNavigationProp = CommunityStackNavigationProp;
export type EventsScreenNavigationProp = CommunityScreenNavigationProp;

export type ProfileScreenNavigationProp = CompositeNavigationProp<
  ProfileStackNavigationProp,
  MainTabNavigationProp
>;

export type GroupChatRouteProp = RouteProp<HomeStackParamList, 'GroupChat'>;
export type EventDetailRouteProp = RouteProp<CommunityStackParamList, 'EventDetail'>;
export type ThemePickerRouteProp = RouteProp<AuthStackParamList | ProfileStackParamList, 'ThemePicker'>;
export type EmailVerificationRouteProp = RouteProp<AuthStackParamList, 'EmailVerification'>;
