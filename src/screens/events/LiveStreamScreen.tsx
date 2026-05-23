// src/screens/events/LiveStreamScreen.tsx
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import HeaderBar from '../../components/common/HeaderBar';
import { Video, ResizeMode, Audio } from 'expo-av';
import { useThemeStore } from '../../store/themeStore';
import { supabase } from '../../services/supabase';
import { BaseColors, Typography, Spacing, Radius, CHURCH } from '../../constants/theme';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import {
  fetchYoutubeLive,
  getYoutubeWatchUrl,
} from '../../services/youtube';
import type { RouteProp } from '@react-navigation/native';
import type { CommunityStackParamList } from '../../types/navigation';

type LiveStreamRouteProp = RouteProp<CommunityStackParamList, 'LiveStream'>;

const { width } = Dimensions.get('window');
const VIDEO_ASPECT_RATIO = 16 / 9;
const VIDEO_HEIGHT = width / VIDEO_ASPECT_RATIO;

/**
 * Detects if a URL is a direct stream (HLS/M3U8)
 */
const isDirectStream = (url?: string) => {
  if (!url) return false;
  return url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('.mp4');
};

/**
 * Normalizes social media URLs to their embeddable formats
 */
const getEmbedUrl = (url?: string) => {
  if (!url) return null;

  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    const watchMatch = url.match(/[?&]v=([^?&]+)/);
    const liveMatch = url.match(/\/live\/([^?&/]+)/);
    const videoId = shortMatch?.[1] ?? watchMatch?.[1] ?? liveMatch?.[1];
    if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`;
  }

  // Facebook
  if (url.includes('facebook.com')) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=${width}`;
  }

  return null;
};

export default function LiveStreamScreen() {
  const { theme } = useThemeStore();
  const route = useRoute<LiveStreamRouteProp>();
  const videoRef = useRef<Video>(null);

  const passedVideoId = route.params?.videoId;

  // Ensure audio plays even if the phone is on silent mode (iOS)
  React.useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  const { data: liveEvent, isLoading } = useQuery({
    queryKey: ['live-event'],
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
    refetchInterval: 30000,
  });

  // YouTube live detection — polls every 15 min to share quota budget across screens
  const { data: youtubeLive } = useQuery({
    queryKey: ['youtube-live'],
    queryFn: fetchYoutubeLive,
    refetchInterval: 1000 * 60 * 15,
    retry: false,
  });

  // Supabase event takes priority; fall back to YouTube live detection
  // If we have a passedVideoId from TodayScreen, use that instead of searching for live
  const activeLiveEvent = passedVideoId
    ? {
        title: 'Playing Video',
        live_url: getYoutubeWatchUrl(passedVideoId),
        description: 'Previously recorded broadcast',
        cover_url: '',
      }
    : (liveEvent ?? (youtubeLive
      ? {
          title: youtubeLive.title,
          live_url: getYoutubeWatchUrl(youtubeLive.id),
          description: 'Live on YouTube',
          cover_url: youtubeLive.thumbnail,
        }
      : null));

  const handleOpenExternal = () => {
    if (activeLiveEvent?.live_url) {
      Linking.openURL(activeLiveEvent.live_url).catch((err) =>
        console.error('Failed to open external live URL:', err)
      );
    }
  };

  const url = activeLiveEvent?.live_url;
  const useNativePlayer = isDirectStream(url);
  const embedUrl = getEmbedUrl(url);
  const isYoutubeUrl = Boolean(url && (url.includes('youtube.com') || url.includes('youtu.be')));

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Live Stream"
        subtitle={activeLiveEvent ? 'LIVE NOW' : 'OFFLINE'}
        backgroundColor={BaseColors.brown900}
        textColor={BaseColors.white}
        subtitleColor={activeLiveEvent ? BaseColors.red500 : BaseColors.gray400}
        enableBlur={true}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : activeLiveEvent ? (
          <View style={styles.liveCard}>
            <View style={styles.playerContainer}>
              {useNativePlayer ? (
                /* Native HLS/Direct Player */
                <Video
                  ref={videoRef}
                  style={styles.nativeVideo}
                  source={{ uri: url! }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping={false}
                  shouldPlay
                />
              ) : embedUrl ? (
                /* Social Embed (YouTube/FB) */
                <WebView
                  style={styles.webview}
                  source={{ uri: embedUrl }}
                  allowsFullscreenVideo
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  renderLoading={() => (
                    <View style={styles.videoLoading}>
                      <ActivityIndicator color={theme.accent} />
                    </View>
                  )}
                />
              ) : (
                <View style={[styles.videoPlaceholder, { backgroundColor: BaseColors.brown900 }]}>
                  <Ionicons name="play-circle" size={80} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.unsupportedText}>Invalid Stream URL</Text>
                </View>
              )}
            </View>

            <View style={styles.details}>
              <View style={styles.titleRow}>
                <Text style={styles.eventTitle}>{activeLiveEvent.title}</Text>
                <View style={[styles.liveBadge, { backgroundColor: BaseColors.red500 }]}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.eventChurch}>{CHURCH.name}</Text>
              <Text style={styles.eventDesc}>{activeLiveEvent.description}</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.externalBtn, { borderColor: theme.accent }]}
                  onPress={handleOpenExternal}
                >
                  <Ionicons name={isYoutubeUrl ? 'logo-youtube' : 'share-outline'} size={18} color={theme.accent} />
                  <Text style={[styles.externalBtnText, { color: theme.accent }]}>
                    {isYoutubeUrl ? 'Open in YouTube' : 'Open in Browser/App'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="videocam-off-outline" size={60} color={BaseColors.brown200} />
            </View>
            <Text style={styles.emptyTitle}>No Active Broadcast</Text>
            <Text style={styles.emptySub}>
              We&apos;ll notify you when our next service starts. Check the Events tab for our upcoming schedule.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Weekly Schedule</Text>
        <View style={styles.scheduleCard}>
          {[
            { day: 'Sunday', time: '8:00 AM', name: 'Special Service' },
            { day: 'Wednesday', time: '5:00 PM', name: 'Bible Study' },
            { day: 'Friday', time: '9:00 AM', name: 'The Lord\'s Day (P.H.D)' },
          ].map((item, index) => (
            <View key={index} style={[styles.scheduleRow, index !== 2 && styles.border]}>
              <View>
                <Text style={styles.scheduleDay}>{item.day}</Text>
                <Text style={styles.scheduleName}>{item.name}</Text>
              </View>
              <Text style={[styles.scheduleTime, { color: theme.accent }]}>{item.time}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.scheduleNote}>P.H.D means Prophecy, Healing and Deliverance.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BaseColors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  headerTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.white },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontFamily: Typography.sansSemiBold, fontSize: 10, letterSpacing: 1 },
  content: { padding: Spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  liveCard: { backgroundColor: BaseColors.white, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: BaseColors.brown100 },
  playerContainer: { width: '100%', height: VIDEO_HEIGHT, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  nativeVideo: { flex: 1, width: '100%', height: '100%' },
  videoLoading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  videoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  unsupportedText: { color: 'rgba(255,255,255,0.5)', fontFamily: Typography.sans, fontSize: 12 },
  details: { padding: Spacing.xl },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  eventTitle: { flex: 1, fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.brown900 },
  liveBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveBadgeText: { color: '#fff', fontSize: 10, fontFamily: Typography.sansSemiBold },
  eventChurch: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, color: BaseColors.brown400, marginBottom: Spacing.md },
  eventDesc: { fontFamily: Typography.sans, fontSize: Typography.sizes.base, color: BaseColors.brown700, lineHeight: 22, marginBottom: Spacing.xl },
  actionRow: { marginTop: Spacing.sm },
  externalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5 },
  externalBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: BaseColors.white, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: BaseColors.brown100 },
  emptyTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.brown900, marginBottom: Spacing.sm },
  emptySub: { fontFamily: Typography.sans, fontSize: Typography.sizes.base, color: BaseColors.brown400, textAlign: 'center', lineHeight: 22 },
  sectionTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, color: BaseColors.brown900, marginTop: Spacing.xl, marginBottom: Spacing.md },
  scheduleCard: { backgroundColor: BaseColors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: BaseColors.brown100 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
  border: { borderBottomWidth: 1, borderBottomColor: BaseColors.brown100 },
  scheduleDay: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base, color: BaseColors.brown900 },
  scheduleName: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs, color: BaseColors.brown400, marginTop: 2 },
  scheduleTime: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  scheduleNote: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.xs,
    color: BaseColors.brown400,
    marginTop: Spacing.md,
  },
});
