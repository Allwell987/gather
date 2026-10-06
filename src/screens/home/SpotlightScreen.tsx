import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import HeaderBar from '../../components/common/HeaderBar';
import EmptyState from '../../components/common/EmptyState';
import { useThemeStore } from '../../store/themeStore';
import { useNotificationStore, SpotlightItem } from '../../store/notificationStore';
import { syncSpotlight } from '../../services/spotlight';
import { Spacing, Radius, Typography, BaseColors } from '../../constants/theme';
import type { HomeStackNavigationProp } from '../../types/navigation';
import { formatDistanceToNow } from 'date-fns';

interface SpotlightSectionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: SpotlightItem[];
  emptyEmoji: string;
  emptyTitle: string;
  emptyDesc: string;
}

function SpotlightSection({ title, icon, items, emptyEmoji, emptyTitle, emptyDesc }: SpotlightSectionProps) {
  const { colors } = useThemeStore();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color={colors.text} style={{ marginRight: 8 }} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {items.length > 0 ? (
          items.map((item, index) => (
            <React.Fragment key={item.id}>
              <View style={styles.listItem}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                  {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: BaseColors.red500 }]} />}
                </View>
                <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.description}</Text>
                <Text style={[styles.itemTime, { color: colors.textMuted }]}>
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </Text>
              </View>
              {index < items.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))
        ) : (
          <EmptyState
            emoji={emptyEmoji}
            title={emptyTitle}
            description={emptyDesc}
          />
        )}
      </View>
    </View>
  );
}

export default function SpotlightScreen() {
  const navigation = useNavigation<HomeStackNavigationProp>();
  const { theme, colors } = useThemeStore();
  const { items, markAllAsRead } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncSpotlight();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    syncSpotlight();
  }, []);

  useEffect(() => {
    // Mark all as read when entering the screen
    // We delay this slightly to let the user see unread indicators first if they want
    const timer = setTimeout(() => {
      markAllAsRead();
    }, 1500);
    return () => clearTimeout(timer);
  }, [markAllAsRead]);

  const notifications = items.filter(i => i.type === 'notification');
  const updates = items.filter(i => i.type === 'update');
  const news = items.filter(i => i.type === 'news');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title="Spotlight"
        subtitle="Latest updates, news, and notifications"
        onBackPress={() => navigation.goBack()}
        showBack={true}
        enableBlur={true}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
        }
      >
        <SpotlightSection
          title="Notifications"
          icon="notifications-outline"
          items={notifications}
          emptyEmoji="🔔"
          emptyTitle="No notifications"
          emptyDesc="We'll let you know when there's something new for you."
        />

        <SpotlightSection
          title="App Updates"
          icon="rocket-outline"
          items={updates}
          emptyEmoji="🚀"
          emptyTitle="No updates yet"
          emptyDesc="We'll post here when we release new features."
        />

        <SpotlightSection
          title="Community News"
          icon="newspaper-outline"
          items={news}
          emptyEmoji="📰"
          emptyTitle="No news"
          emptyDesc="Stay tuned for community stories and events."
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Typography.sansSemiBold,
  },
  sectionContent: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listItem: {
    padding: Spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: Typography.sansSemiBold,
    flex: 1,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
  },
  itemDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 10,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    width: '100%',
  },
});
