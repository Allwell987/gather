// src/screens/home/NotificationsScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import HeaderBar from '../../components/common/HeaderBar';
import EmptyState from '../../components/common/EmptyState';
import { useThemeStore } from '../../store/themeStore';
import type { HomeStackNavigationProp } from '../../types/navigation';

export default function NotificationsScreen() {
  const navigation = useNavigation<HomeStackNavigationProp>();
  const { colors } = useThemeStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title="Notifications"
        subtitle="Stay updated with your community"
        onBackPress={() => navigation.goBack()}
        showBack={true}
        enableBlur={true}
      />
      <View style={styles.content}>
        <EmptyState
          emoji="🔔"
          title="No notifications yet"
          description="We'll notify you when something important happens in your community."
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
