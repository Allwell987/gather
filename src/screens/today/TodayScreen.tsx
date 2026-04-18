// src/screens/today/TodayScreen.tsx
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, Linking, RefreshControl, Share, Animated,
  ActivityIndicator, LayoutAnimation, Platform, UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
// import { supabase } from '../../services/supabase';
import { BaseColors, Typography, Spacing, Radius, CHURCH } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import HeaderBar from '../../components/common/HeaderBar';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import {
  fetchYoutubeVideos,
  fetchYoutubeLive,
  getYoutubeWatchUrl,
  getYoutubeChannelUrl,
} from '../../services/youtube';
import type { MainTabNavigationProp } from '../../types/navigation';

// Helper to get YouTube ID from various URL formats
const getYoutubeIdFromUrl = (url?: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getDayTheme = (day: number) => {
  const themes = [
    'Sabbath Rest & Worship',
    'Divine Direction & Purpose',
    'Grace & New Beginnings',
    'Faith & Perseverance',
    'Wisdom & Understanding',
    'Power & Dominion',
    'Fruitfulness & Multiplication',
  ];
  return themes[day] || 'Walking in the Spirit';
};

const getMonthFocus = (month: number) => {
  const focuses = [
    'Vision & Clarity', 'Consecration', 'Kingdom Advancement',
    'The Risen Christ', 'Grace Abounding', 'Divine Speed',
    'Perfect Completion', 'New Horizons', 'Fruit of the Spirit',
    'Harvest & Increase', 'Gratitude', 'Crown of the Year',
  ];
  return focuses[month] || 'Kingdom Living';
};

const FALLBACK_VIDEOS = [
  { id: '1', title: 'Sunday Celebration Service', thumbnail: 'https://images.unsplash.com/photo-1510563354643-2ef53607f15a?q=80&w=400', speaker: 'CHURCH' },
];

type VideoItem = {
  id: string;
  title: string;
  thumbnail: string;
  speaker: string;
  youtubeId?: string;
  duration?: string;
};

const DAILY_DEVOTIONAL = {
  title: 'Walking in the Light',
  reference: '1 John 1:7',
  content: 'But if we walk in the light, as he is in the light, we have fellowship with one another...',
  author: 'Lead Pastor',
};

export default function TodayScreen() {
  const navigation = useNavigation<MainTabNavigationProp>();
  const { user } = useAuthStore();
  const { theme, colors } = useThemeStore();
  const headerEnter = useRef(new Animated.Value(0)).current;
  const contentEnter = useRef(new Animated.Value(0)).current;

  const [markingRead, setMarkingRead] = useState(false);
  const readScale = useRef(new Animated.Value(1)).current;

  // Enable LayoutAnimation for Android (Old Architecture only)
  if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental &&
    !(global as any)._IS_FABRIC
  ) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const now = new Date();
  const todayDate = format(now, 'yyyy-MM-dd');

  // Fetch the latest devotional from Supabase (up to today)
  const { data: devotional, isLoading: isLoadingDevotional, refetch: refetchDevotional } = useQuery<import('../../types/database').Devotional | null>({
    queryKey: ['devotional', todayDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devotionals')
        .select('*')
        .lte('publish_date', todayDate)
        .order('publish_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Check if today's devotional has been read
  const { data: hasReadToday, refetch: refetchReadStatus } = useQuery({
    queryKey: ['devotional-read-status', user?.id, todayDate],
    queryFn: async () => {
      if (!user?.id || !devotional?.id) return false;
      const { count, error } = await supabase
        .from('devotional_reads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('devotional_id', devotional.id);
      if (error) return false;
      return (count ?? 0) > 0;
    },
    enabled: !!user?.id && !!devotional?.id,
  });

  const handleMarkAsRead = useCallback(async () => {
    if (markingRead || hasReadToday || !user?.id || !devotional?.id) return;

    // Scale pop animation
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.timing(readScale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.spring(readScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    try {
      setMarkingRead(true);
      const { error } = await supabase
        .from('devotional_reads')
        .upsert(
          {
            user_id: user.id,
            devotional_id: devotional.id,
          } as never,
          { onConflict: 'user_id,devotional_id' }
        );
      if (error) throw error;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      void refetchReadStatus();
    } catch (err) {
      console.error('Error marking as read:', err);
      Alert.alert('Error', 'Could not mark as read.');
    } finally {
      setMarkingRead(false);
    }
  }, [markingRead, hasReadToday, user?.id, devotional?.id, readScale, refetchReadStatus]);

  const displayTheme = devotional?.theme ?? getDayTheme(now.getDay());
  const displayFocus = devotional?.month_focus ?? getMonthFocus(now.getMonth());

  // Dynamic check for live events (Supabase — admin-controlled)
  const { data: liveEvent, isLoading: isLoadingLive, refetch: refetchLive } = useQuery({
    queryKey: ['live-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_live', true)
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 1000 * 60 * 5,
  });

  // YouTube live detection — polls every 15 min to stay within API quota
  const { data: youtubeLive } = useQuery({
    queryKey: ['youtube-live'],
    queryFn: fetchYoutubeLive,
    refetchInterval: 1000 * 60 * 15,
    retry: false,
  });

  // YouTube video library
  const { data: youtubeVideos = [] } = useQuery({
    queryKey: ['youtube-videos'],
    queryFn: () => fetchYoutubeVideos(8),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  // Merge live sources: Supabase (manual admin toggle) takes priority, then YouTube
  const activeLive = useMemo(() => (
    liveEvent ?? (youtubeLive
      ? {
          title: youtubeLive.title,
          live_url: getYoutubeWatchUrl(youtubeLive.id),
          cover_url: youtubeLive.thumbnail,
          category: 'Live Service',
        }
      : null)
  ), [liveEvent, youtubeLive]);

  // Map YouTube videos to unified VideoItem type
  const displayVideos: VideoItem[] = youtubeVideos.length > 0
    ? youtubeVideos.map((v) => ({
        id: v.id,
        title: v.title,
        thumbnail: v.thumbnail,
        speaker: CHURCH.name,
        youtubeId: v.id,
      }))
    : FALLBACK_VIDEOS;

  const isLive = Boolean(activeLive);

  const displayDevotional = useMemo(() => (
    devotional
      ? {
          ...devotional,
          author: DAILY_DEVOTIONAL.author,
        }
      : {
          title: DAILY_DEVOTIONAL.title,
          anchor_scripture: DAILY_DEVOTIONAL.reference,
          core_teaching: DAILY_DEVOTIONAL.content,
          author: DAILY_DEVOTIONAL.author,
          opening_charge: '',
          supporting_scriptures: [] as string[],
          spiritual_insight: '',
          biblical_example: '',
          warning_correction: '',
          declaration: '',
          summary: '',
        }
  ), [devotional]);

  const openInAppPlayer = useCallback((videoId: string) => {
    navigation.navigate('CommunityTab', {
      screen: 'LiveStream',
      params: { videoId }
    } as any);
  }, [navigation]);

  const handleJoinLive = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const youtubeId = getYoutubeIdFromUrl(activeLive?.live_url);
    if (youtubeId) {
      openInAppPlayer(youtubeId);
      return;
    }
    const liveUrl = activeLive?.live_url ?? getYoutubeChannelUrl();
    Linking.openURL(liveUrl).catch(() => {
      Alert.alert('Error', 'Could not open live stream.');
    });
  }, [activeLive, openInAppPlayer]);

  const handleShareDevotional = useCallback(async () => {
    try {
      let shareMessage = `📖 *${displayDevotional.title}*\n\n`;
      shareMessage += `📜 *Scripture:* ${displayDevotional.anchor_scripture}\n\n`;

      if (displayDevotional.opening_charge) {
        shareMessage += `⚡ *Opening Charge:*\n${displayDevotional.opening_charge}\n\n`;
      }

      shareMessage += `📝 *Teaching:*\n${displayDevotional.core_teaching}\n\n`;

      if (displayDevotional.spiritual_insight) {
        shareMessage += `💎 *Insight:*\n${displayDevotional.spiritual_insight}\n\n`;
      }

      if (displayDevotional.declaration) {
        shareMessage += `🗣️ *Declaration:*\n"${displayDevotional.declaration}"\n\n`;
      }

      shareMessage += `✍️ — ${displayDevotional.author}\n\n`;
      shareMessage += `Shared from ${CHURCH.name} App`;

      await Share.share({
        message: shareMessage,
        title: displayDevotional.title,
      });
    } catch {
      Alert.alert('Error', 'Something went wrong while sharing.');
    }
  }, [displayDevotional]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isLive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isLive, pulseAnim]);

  useEffect(() => {
    Animated.stagger(80, [
      Animated.timing(headerEnter, {
        toValue: 1,
        duration: 330,
        useNativeDriver: true,
      }),
      Animated.timing(contentEnter, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerEnter, contentEnter]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title="Today"
        subtitle={now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        showBack={false}
        backgroundColor={BaseColors.brown900}
        textColor={BaseColors.white}
        subtitleColor={BaseColors.brown200}
        rightIcon={isLive ? "radio" : undefined}
        accentColor={BaseColors.red500}
        rightAction={isLive ? handleJoinLive : undefined}
        style={{ borderBottomWidth: 0 }}
        enableBlur={true}
      />

      <Animated.ScrollView
        style={{
          opacity: contentEnter,
          transform: [
            {
              translateY: contentEnter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
            },
          ],
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isLoadingLive || isLoadingDevotional}
            onRefresh={() => { void refetchLive(); void refetchDevotional(); }}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      >
        {/* Monthly & Daily Focus Band */}
        <View style={[styles.focusBand, { backgroundColor: theme.accentLight }]}>
          <View style={styles.focusItem}>
            <Text style={[styles.focusLabel, { color: theme.accent }]}>MONTHLY FOCUS</Text>
            <Text style={[styles.focusValue, { color: theme.accentDeep }]}>{displayFocus}</Text>
          </View>
          <View style={[styles.focusDivider, { backgroundColor: theme.accent + '33' }]} />
          <View style={styles.focusItem}>
            <Text style={[styles.focusLabel, { color: theme.accent }]}>DAILY THEME</Text>
            <Text style={[styles.focusValue, { color: theme.accentDeep }]}>{displayTheme}</Text>
          </View>
        </View>

        {/* Live Card */}
        {isLive && (
          <TouchableOpacity style={styles.liveCard} activeOpacity={0.9} onPress={handleJoinLive}>
            <Image
              source={{ uri: activeLive?.cover_url || 'https://images.unsplash.com/photo-1510563354643-2ef53607f15a?q=80&w=800&auto=format&fit=crop' }}
              style={styles.liveImage}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.liveOverlay}
            >
              <View style={styles.liveInfo}>
                <Text style={styles.liveTag}>{activeLive?.category?.toUpperCase?.() ?? 'CHURCH SERVICE'}</Text>
                <Text style={styles.liveTitle}>{activeLive?.title ?? 'Live Broadcast'}</Text>
                <TouchableOpacity style={[styles.joinBtn, { backgroundColor: theme.accent }]} onPress={handleJoinLive}>
                  <Ionicons name="play" size={18} color={BaseColors.white} />
                  <Text style={styles.joinBtnText}>Watch Live</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Daily Devotional Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Devotional</Text>
        </View>
        <View style={[styles.devotionalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.devoTitle, { color: theme.accent }]}>{displayDevotional.title}</Text>
          <Text style={[styles.devoRef, { color: colors.textSecondary }]}>{displayDevotional.anchor_scripture}</Text>

          {displayDevotional.opening_charge ? (
            <View style={styles.devoSection}>
              <View style={styles.devoSectionHeader}>
                <Ionicons name="flash-outline" size={16} color={theme.accent} />
                <Text style={[styles.devoSectionTitle, { color: theme.accent }]}>Opening Charge</Text>
              </View>
              <Text style={[styles.devoSectionContent, { color: colors.text }]}>{displayDevotional.opening_charge}</Text>
            </View>
          ) : null}

          <View style={styles.devoSection}>
            <Text style={[styles.devoSectionContent, { color: colors.text, lineHeight: 26 }]}>
              {displayDevotional.core_teaching}
            </Text>
          </View>

          {displayDevotional.supporting_scriptures && displayDevotional.supporting_scriptures.length > 0 ? (
            <View style={styles.devoSection}>
              <View style={styles.devoSectionHeader}>
                <Ionicons name="bookmarks-outline" size={16} color={theme.accent} />
                <Text style={[styles.devoSectionTitle, { color: theme.accent }]}>Supporting Scriptures</Text>
              </View>
              {displayDevotional.supporting_scriptures.map((s, i) => (
                <Text key={i} style={[styles.devoSectionContent, { color: colors.textSecondary, marginBottom: 2 }]}>• {s}</Text>
              ))}
            </View>
          ) : null}

          {displayDevotional.spiritual_insight ? (
            <View style={[styles.devoHighlightCard, { backgroundColor: theme.accentSubtle }]}>
              <View style={styles.devoSectionHeader}>
                <Ionicons name="diamond-outline" size={16} color={theme.accentDeep} />
                <Text style={[styles.devoSectionTitle, { color: theme.accentDeep }]}>Spiritual Insight</Text>
              </View>
              <Text style={[styles.devoSectionContent, { color: colors.text, fontStyle: 'italic' }]}>{displayDevotional.spiritual_insight}</Text>
            </View>
          ) : null}

          {displayDevotional.biblical_example ? (
            <View style={styles.devoSection}>
              <View style={styles.devoSectionHeader}>
                <Ionicons name="ribbon-outline" size={16} color={theme.accent} />
                <Text style={[styles.devoSectionTitle, { color: theme.accent }]}>Biblical Example</Text>
              </View>
              <Text style={[styles.devoSectionContent, { color: colors.text }]}>{displayDevotional.biblical_example}</Text>
            </View>
          ) : null}

          {displayDevotional.warning_correction ? (
            <View style={[styles.devoHighlightCard, { backgroundColor: colors.error + '10' }]}>
              <View style={styles.devoSectionHeader}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={[styles.devoSectionTitle, { color: colors.error }]}>Warning & Correction</Text>
              </View>
              <Text style={[styles.devoSectionContent, { color: colors.text }]}>{displayDevotional.warning_correction}</Text>
            </View>
          ) : null}

          {displayDevotional.declaration ? (
            <View style={styles.devoSection}>
              <View style={styles.devoSectionHeader}>
                <Ionicons name="megaphone-outline" size={16} color={theme.accent} />
                <Text style={[styles.devoSectionTitle, { color: theme.accent }]}>Prophetic Declaration</Text>
              </View>
              <Text style={[styles.devoSectionContent, { color: theme.accentDeep, fontFamily: Typography.sansSemiBold, fontSize: 15 }]}>&quot;{displayDevotional.declaration}&quot;</Text>
            </View>
          ) : null}

          {displayDevotional.summary ? (
            <View style={styles.devoSection}>
              <View style={styles.devoSectionHeader}>
                <Ionicons name="document-text-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.devoSectionTitle, { color: colors.textMuted }]}>Summary</Text>
              </View>
              <Text style={[styles.devoSectionContent, { color: colors.textSecondary, fontSize: 13 }]}>{displayDevotional.summary}</Text>
            </View>
          ) : null}

          <View style={styles.devoFooter}>
            <Text style={[styles.devoAuthor, { color: colors.textMuted }]}>— {displayDevotional.author}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={handleMarkAsRead}
                disabled={!!hasReadToday || markingRead}
                activeOpacity={0.7}
              >
                <Animated.View style={[
                  styles.markReadBtn,
                  {
                    transform: [{ scale: readScale }],
                    backgroundColor: hasReadToday ? theme.accent + '15' : 'transparent',
                    borderColor: hasReadToday ? 'transparent' : theme.accent + '40'
                  }
                ]}>
                  {markingRead ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : (
                    <Ionicons
                      name={hasReadToday ? "checkmark-circle" : "checkmark-circle-outline"}
                      size={20}
                      color={theme.accent}
                    />
                  )}
                  {!hasReadToday && !markingRead && (
                    <Text style={[styles.markReadText, { color: theme.accent }]}>
                      Mark as Read
                    </Text>
                  )}
                  {hasReadToday && (
                    <Text style={[styles.markReadText, { color: theme.accent }]}>
                      Read
                    </Text>
                  )}
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShareDevotional}>
                <Ionicons name="share-social-outline" size={20} color={theme.accent} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Video Library Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Video Library</Text>
          <TouchableOpacity onPress={() => Linking.openURL(getYoutubeChannelUrl())}>
            <Text style={[styles.seeAll, { color: theme.accent }]}>Channel</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.videoScroll}>
          {displayVideos.map((video) => (
            <TouchableOpacity
              key={video.id}
              style={[styles.videoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => video.youtubeId ? openInAppPlayer(video.youtubeId) : undefined}
              activeOpacity={video.youtubeId ? 0.7 : 1}
            >
              <View style={styles.thumbnailWrap}>
                <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
                {video.duration && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{video.duration}</Text>
                  </View>
                )}
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.8)" />
                </View>
                {video.youtubeId && (
                  <View style={styles.ytBadge}>
                    <Ionicons name="logo-youtube" size={14} color="#FF0000" />
                  </View>
                )}
              </View>
              <View style={styles.videoInfo}>
                <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={1}>{video.title}</Text>
                <Text style={[styles.videoSpeaker, { color: colors.textSecondary }]}>{video.speaker}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  headerTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.white },
  headerSub: { fontFamily: Typography.sansMedium, fontSize: Typography.sizes.xs, color: BaseColors.brown200, letterSpacing: 0.3 },
  liveIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BaseColors.white },
  liveIndicatorText: { fontFamily: Typography.sansSemiBold, fontSize: 9, color: BaseColors.white, letterSpacing: 1.1 },
  scrollContent: { paddingBottom: 40 },
  focusBand: {
    flexDirection: 'row', padding: Spacing.lg, marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl, borderRadius: Radius.xl, alignItems: 'center',
  },
  focusItem: { flex: 1, alignItems: 'center' },
  focusLabel: { fontFamily: Typography.sansSemiBold, fontSize: 9, letterSpacing: 1.4, marginBottom: 2 },
  focusValue: { fontFamily: Typography.serif, fontSize: Typography.sizes.base, textAlign: 'center' },
  focusDivider: { width: 1, height: '100%', marginHorizontal: Spacing.md },
  liveCard: {
    margin: Spacing.xl, height: 200, borderRadius: Radius.xl,
    overflow: 'hidden', position: 'relative',
  },
  liveImage: { width: '100%', height: '100%' },
  liveOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: Spacing.xl },
  liveInfo: { gap: 4 },
  liveTag: { fontFamily: Typography.sansSemiBold, fontSize: 9, color: 'rgba(255,255,255,0.8)', letterSpacing: 1.4 },
  liveTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.lg, color: BaseColors.white, marginBottom: Spacing.sm },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: Radius.md,
  },
  joinBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.white },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, marginTop: Spacing.xl, marginBottom: Spacing.md,
  },
  sectionTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, letterSpacing: 0.2 },
  seeAll: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs, letterSpacing: 0.5, textTransform: 'uppercase' },
  devotionalCard: {
    marginHorizontal: Spacing.xl, padding: Spacing.xl, borderRadius: Radius.xl,
    borderWidth: 1, gap: Spacing.sm,
  },
  devoTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.lg },
  devoRef: { fontFamily: Typography.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2 },
  devoContent: { fontFamily: Typography.sans, fontSize: Typography.sizes.base, lineHeight: 24, marginTop: Spacing.sm },
  devoFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  devoAuthor: { fontFamily: Typography.sansMedium, fontSize: Typography.sizes.sm, fontStyle: 'italic' },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 6,
  },
  markReadText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 12,
  },
  shareBtn: { padding: 4 },
  devoSection: { marginTop: Spacing.lg },
  devoSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  devoSectionTitle: { fontFamily: Typography.sansSemiBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  devoSectionContent: { fontFamily: Typography.sans, fontSize: Typography.sizes.base, lineHeight: 22 },
  devoHighlightCard: { padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.md },
  videoScroll: { paddingLeft: Spacing.xl, gap: Spacing.md, paddingRight: Spacing.xl },
  videoCard: {
    width: 220,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: BaseColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbnailWrap: { width: '100%', height: 124, position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  durationBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4,
  },
  durationText: { color: BaseColors.white, fontSize: 10, fontFamily: Typography.sansSemiBold },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  ytBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 4, padding: 3 },
  videoInfo: { padding: Spacing.md },
  videoTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  videoSpeaker: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs, marginTop: 2 },
});
