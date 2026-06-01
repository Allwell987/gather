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
import AnimatedEntrance from '../../components/common/AnimatedEntrance';
import Pulse from '../../components/common/Pulse';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import { useHome } from './hooks/useHome';
import { fetchDailyVerse, DailyVerse } from '../../services/dailyVerse';
import { fetchYoutubeVideos, YoutubeVideo, getYoutubeWatchUrl } from '../../services/youtube';
import type { HomeScreenNavigationProp } from '../../types/navigation';

const QUICK_ACCESS = [
  { id: 'bible', label: 'Bible', icon: 'book-outline', tab: 'BibleTab', color: '#4A90A4' },
  { id: 'prayer', label: 'AI Prayer', icon: 'sparkles-outline', screen: 'PrayerGenerator', color: '#8E44AD' },
  { id: 'give', label: 'Support App', icon: 'card-outline', screen: 'Giving', color: '#27AE60' },
  { id: 'today', label: 'Today', icon: 'calendar-outline', tab: 'TodayTab', color: '#E67E22' },
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuthStore();
  const { theme, colors } = useThemeStore();
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
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
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
            <LinearGradient colors={[BaseColors.brown900, BaseColors.brown900]} style={StyleSheet.absoluteFill} />
            <View style={styles.verseCard}>
              <Text style={styles.verseEye}>✦ Verse of the day</Text>
              {dailyVerse ? (
                <>
                  <Text style={styles.verseText}>{dailyVerse.text}</Text>
                  <Text style={{ color: theme.accentBorder }}>{dailyVerse.reference}</Text>
                  <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                    <Ionicons name="share-social-outline" size={14} color="#fff" />
                    <Text style={{ color: '#fff' }}>Share</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} />
              )}
            </View>
          </View>
        </AnimatedEntrance>

        <View style={styles.body}>
          <AnimatedEntrance delay={200}>
            <View style={[styles.streak, { backgroundColor: colors.card }]}>
              <Pulse>
                <Text style={{ fontSize: 24 }}>{streak.count > 0 ? '🔥' : '🌱'}</Text>
              </Pulse>
              <View>
                <Text style={{ fontWeight: 'bold', color: colors.text }}>{streak.count}-day streak</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{streak.status}</Text>
              </View>
            </View>
          </AnimatedEntrance>

          <AnimatedEntrance delay={300}>
            <Text style={styles.sectionTitle}>Quick access</Text>
            <View style={styles.grid}>
              {QUICK_ACCESS.map((item, index) => {
                const scale = useSharedValue(1);
                const animatedStyle = useAnimatedStyle(() => ({
                  transform: [{ scale: scale.value }],
                }));

                const onPressIn = () => {
                  scale.value = withSpring(0.9, { stiffness: 300, damping: 15 });
                };
                const onPressOut = () => {
                  scale.value = withSpring(1, { stiffness: 300, damping: 15 });
                };

                return (
                  <Animated.View key={item.id} style={[{ flex: 1 }, animatedStyle]}>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPressIn={onPressIn}
                      onPressOut={onPressOut}
                      style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => item.tab ? navigation.navigate(item.tab as any) : navigation.navigate(item.screen as any)}
                    >
                      <Ionicons name={item.icon as any} size={20} color={item.color} />
                      <Text style={{ color: item.color, fontSize: 11, fontWeight: '600' }}>{item.label}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </AnimatedEntrance>

          <AnimatedEntrance delay={400}>
            <Text style={styles.sectionTitle}>Next Service</Text>
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
                <Text style={styles.sectionTitle}>Latest Sermons</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://youtube.com')}>
                  <Text style={{ color: theme.accent, fontSize: 12 }}>View all</Text>
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
                        <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>Watch now</Text>
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
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  hero: { padding: Spacing.xl, backgroundColor: BaseColors.brown900 },
  verseCard: { padding: Spacing.xl, borderRadius: Radius.xl, backgroundColor: 'rgba(255,255,255,0.07)' },
  verseEye: { color: '#fff', fontSize: 10, opacity: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  verseText: { color: '#fff', fontSize: 18, fontFamily: Typography.serif, fontStyle: 'italic', marginBottom: 12 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  body: { padding: Spacing.xl },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: Radius.lg, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 16 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  gridItem: { flex: 1, padding: 12, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', gap: 8 },
  service: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: Radius.lg, borderWidth: 1 },
  sermonsScroll: { marginHorizontal: -Spacing.xl, paddingHorizontal: Spacing.xl },
  sermonCard: { width: 220, borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  sermonThumb: { width: '100%', height: 120 },
  sermonInfo: { padding: 12 },
  sermonTitle: { fontSize: 13, fontFamily: Typography.sansSemiBold, marginBottom: 8 },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
