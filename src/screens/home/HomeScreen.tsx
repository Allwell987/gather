// src/screens/home/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, RefreshControl, Share, ActivityIndicator, Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderBar from '../../components/common/HeaderBar';
import GlassView from '../../components/common/GlassView';
import AnimatedEntrance from '../../components/common/AnimatedEntrance';
import Pulse from '../../components/common/Pulse';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useNotificationStore } from '../../store/notificationStore';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import { useHome } from './hooks/useHome';
import { fetchDailyVerse, DailyVerse } from '../../services/dailyVerse';
import { fetchYoutubeVideos, YoutubeVideo, getYoutubeWatchUrl, getYoutubeChannelUrl } from '../../services/youtube';
import { t, getDeviceLocale } from '../../services/locale';
import type { HomeScreenNavigationProp } from '../../types/navigation';

const QUICK_ACCESS = [
  { id: 'bible', labelKey: 'bible', icon: 'book-outline', tab: 'BibleTab', color: '#4A90A4' },
  { id: 'prayer', labelKey: 'prayer', icon: 'sparkles-outline', screen: 'PrayerGenerator', color: '#8E44AD' },
  { id: 'give', labelKey: 'give', icon: 'card-outline', screen: 'Giving', color: '#27AE60' },
  { id: 'today', labelKey: 'today', icon: 'calendar-outline', tab: 'TodayTab', color: '#E67E22' },
] as const;

interface QuickAccessItemProps {
  item: typeof QUICK_ACCESS[number];
  navigation: HomeScreenNavigationProp;
}

function QuickAccessItem({ item, navigation }: QuickAccessItemProps) {
  const { colors } = useThemeStore();
  const locale = getDeviceLocale();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    // Reanimated shared values are intentionally mutable here.
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(0.9, { stiffness: 300, damping: 15 });
  };

  const onPressOut = () => {
    // Reanimated shared values are intentionally mutable here.
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(1, { stiffness: 300, damping: 15 });
  };

  const handlePress = () => {
    if ('tab' in item && item.tab) {
      navigation.navigate(item.tab as any);
    } else if ('screen' in item && item.screen) {
      navigation.navigate(item.screen as any);
    }
  };

  return (
    <Animated.View style={[styles.gridItemWrapper, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handlePress}
      >
        <Ionicons name={item.icon as any} size={20} color={item.color} />
        <Text style={{ color: item.color, fontSize: 11, fontWeight: '600' }}>
          {item.id === 'give' ? t('supportLegal', locale).split(' ')[0] : t(item.labelKey as any, locale)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const locale = getDeviceLocale();
  const { user } = useAuthStore();
  const { theme, colors } = useThemeStore();
  const hasUnread = useNotificationStore(state => state.hasUnread());
  const { greeting, nextService, isLoading, streak, refetch } = useHome(user);

  const [dailyVerse, setDailyVerse] = useState<DailyVerse | null>(null);
  const [latestVideos, setLatestVideos] = useState<YoutubeVideo[]>([]);

  useEffect(() => {
    fetchDailyVerse().then(setDailyVerse);
    fetchYoutubeVideos(4)
      .then(setLatestVideos);
  }, []);

  const handleShare = () => {
    if (dailyVerse) {
      Share.share({ message: `${dailyVerse.text}\n— ${dailyVerse.reference}` });
    }
  };

  const handleWatchSermon = (videoId: string) => {
    Linking.openURL(getYoutubeWatchUrl(videoId));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title={`${user?.full_name?.split(' ')[0] ?? 'Friend'} 👋`}
        subtitle={greeting}
        showBack={false}
        enableBlur
        rightElement={
          <View style={styles.navRight}>
            {streak.count > 0 && (
              <View style={styles.minimalStreak}>
                <Pulse>
                  <Text style={{ fontSize: 18 }}>🔥</Text>
                </Pulse>
                <Text style={[styles.minimalStreakText, { color: colors.text }]}>{streak.count}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('Spotlight')}>
              <GlassView
                borderRadius={Radius.full}
                intensity={30}
                showBorder
                showGlow={false}
                style={styles.bellWrapper}
              >
                <View style={styles.bellIconInner}>
                  <Ionicons name="notifications-outline" size={18} color={colors.text} />
                  {hasUnread && <View style={[styles.badge, { backgroundColor: BaseColors.red500 }]} />}
                </View>
              </GlassView>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ProfileTab')}>
              <View style={[styles.avatar, { backgroundColor: theme.accent }]}><Text style={styles.avatarText}>{(user?.full_name || 'G')[0]}</Text></View>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.accent} />}
      >
        <AnimatedEntrance delay={100}>
          <View style={styles.hero}>
            <LinearGradient
              colors={[BaseColors.brown900, colors.background]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            {dailyVerse?.backgroundImage && (
              <Image
                source={{ uri: dailyVerse.backgroundImage }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            )}
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.themeMode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.4)' }
              ]}
            />
            <View style={{ padding: Spacing.xl, justifyContent: 'center', flex: 1 }}>
              <GlassView
                style={styles.verseBox}
                borderRadius={Radius.xl}
                intensity={20}
                showGlow
              >
                <View style={{ padding: Spacing.xl }}>
                  <Text style={styles.verseEye}>✦ {t('verseOfTheDay', locale)}</Text>
                  {dailyVerse ? (
                    <>
                      <Text style={styles.verseText}>{dailyVerse.text}</Text>
                      <Text style={[styles.verseReference, { color: theme.accentBorder }]}>{dailyVerse.reference}</Text>
                      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                        <Ionicons name="share-social-outline" size={14} color="#fff" />
                        <Text style={{ color: '#fff' }}>{t('share', locale)}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} />
                  )}
                </View>
              </GlassView>
            </View>
          </View>
        </AnimatedEntrance>

        <View style={styles.body}>
          <AnimatedEntrance delay={300}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('quickAccess', locale)}</Text>
            <View style={styles.grid}>
              {QUICK_ACCESS.map((item) => (
                <QuickAccessItem
                  key={item.id}
                  item={item}
                  navigation={navigation}
                />
              ))}
            </View>
          </AnimatedEntrance>

          <AnimatedEntrance delay={400}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('nextService', locale)}</Text>
            <View style={[styles.service, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View>
                <Text style={{ color: theme.accent, fontWeight: 'bold' }}>{nextService?.day}</Text>
                <Text style={{ color: colors.text }}>{nextService?.service}</Text>
              </View>
              <Text style={{ color: colors.text }}>{nextService?.time}</Text>
            </View>
          </AnimatedEntrance>

          {latestVideos.length > 0 && (
            <AnimatedEntrance delay={500}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('latestSermons', locale)}</Text>
                <TouchableOpacity onPress={() => Linking.openURL(getYoutubeChannelUrl())}>
                  <Text style={{ color: theme.accent, fontSize: 12 }}>{t('viewAll', locale)}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sermonsScroll} contentContainerStyle={{ gap: 12 }}>
                {latestVideos.map(video => (
                  <TouchableOpacity key={video.id} style={[styles.sermonCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleWatchSermon(video.id)}>
                    <Image source={{ uri: video.thumbnail }} style={styles.sermonThumb} />
                    <View style={styles.sermonInfo}>
                      <Text style={[styles.sermonTitle, { color: colors.text }]} numberOfLines={2}>{video.title}</Text>
                      <View style={styles.playRow}>
                        <Ionicons name="play-circle" size={16} color={theme.accent} />
                        <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>{t('watchNow', locale)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </AnimatedEntrance>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 16 },
  bellWrapper: { width: 34, height: 34 },
  bellIconInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  hero: {
    margin: Spacing.xl,
    borderRadius: Radius.xl,
    backgroundColor: BaseColors.brown900,
    overflow: 'hidden',
    minHeight: 220,
    position: 'relative',
  },
  verseBox: { borderRadius: Radius.xl },
  verseEye: { color: '#fff', fontSize: 10, opacity: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  verseText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Typography.serif,
    fontStyle: 'italic',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verseReference: {
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  body: { padding: Spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  gridItemWrapper: { width: '48%' },
  gridItem: { minHeight: 112, padding: 12, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  service: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: Radius.lg, borderWidth: 1 },
  sermonsScroll: { marginHorizontal: -Spacing.xl, paddingHorizontal: Spacing.xl },
  sermonCard: { width: 220, borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  sermonThumb: { width: '100%', height: 120 },
  sermonInfo: { padding: 12 },
  sermonTitle: { fontSize: 13, fontFamily: Typography.sansSemiBold, marginBottom: 8 },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  minimalStreak: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 4 },
  minimalStreakText: { fontSize: 14, fontWeight: 'bold' },
});
