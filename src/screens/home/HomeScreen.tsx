// src/screens/home/HomeScreen.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Animated, RefreshControl, Share, TextInput,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import RNModal from 'react-native-modal';
import AnimatedReanimated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import {
  formatOfflineTimestamp,
  readOfflineCache,
  writeOfflineCache,
} from '../../services/offlineCache';
import { supabase } from '../../services/supabase';
import { BaseColors, Typography, Spacing, Radius, DAILY_VERSE } from '../../constants/theme';
import type { HomeScreenNavigationProp } from '../../types/navigation';
import { differenceInDays } from 'date-fns';

const QUICK_ACCESS = [
  { id: 'bible', label: 'Bible', icon: 'book-outline', tab: 'BibleTab', color: '#4A90A4' },
  { id: 'community', label: 'Community', icon: 'people-outline', tab: 'CommunityTab', color: '#9B59B6' },
  { id: 'give', label: 'Give', icon: 'card-outline', screen: 'Giving', color: '#27AE60' },
  { id: 'today', label: 'Today', icon: 'calendar-outline', tab: 'TodayTab', color: '#E67E22' },
];

const SERVICE_TIMES = [
  { day: 'Sunday', service: 'Special Service', time: '8:00 AM', dayNum: 0, hour: 8 },
  { day: 'Wednesday', service: 'Bible Study', time: '5:00 PM', dayNum: 3, hour: 17 },
  { day: 'Friday', service: 'The Lord\'s Day (P.H.D)', time: '9:00 AM', dayNum: 5, hour: 9 },
];

const HOME_CACHE_KEY = 'home-summary';

const readProfileTimeZone = (profile: unknown): string | null => {
  if (!profile || typeof profile !== 'object') return null;
  const candidateFields = ['time_zone', 'timezone', 'timeZone'] as const;

  for (const field of candidateFields) {
    const value = (profile as Record<string, unknown>)[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const getHourForTimeZone = (date: Date, timeZone?: string | null): number => {
  if (!timeZone) return date.getHours();

  try {
    const hourPart = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hour12: false,
      timeZone,
    })
      .formatToParts(date)
      .find((part) => part.type === 'hour')?.value;

    const parsedHour = hourPart ? Number.parseInt(hourPart, 10) : Number.NaN;
    return Number.isNaN(parsedHour) ? date.getHours() : parsedHour;
  } catch {
    return date.getHours();
  }
};

const getGreetingByHour = (hour: number): string => {
  if (hour >= 5 && hour < 12) return 'Good morning,';
  if (hour >= 12 && hour < 17) return 'Good afternoon,';
  if (hour >= 17 && hour < 22) return 'Good evening,';
  return 'Good night,';
};

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuthStore();
  const { theme, colors } = useThemeStore();
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroEnter = useRef(new Animated.Value(0)).current;
  const bodyEnter = useRef(new Animated.Value(0)).current;
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showingCachedData, setShowingCachedData] = useState(false);
  const [offlineTimestamp, setOfflineTimestamp] = useState<string | null>(null);
  const [showVerseNoteModal, setShowVerseNoteModal] = useState(false);
  const [verseNoteText, setVerseNoteText] = useState('');
  const [savingVerseNote, setSavingVerseNote] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const getNextService = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() + now.getMinutes() / 60;

    // Sort services by day and time
    const sortedServices = [...SERVICE_TIMES].sort((a, b) => {
      if (a.dayNum !== b.dayNum) return a.dayNum - b.dayNum;
      return a.hour - b.hour;
    });

    // Find first service later today
    let next = sortedServices.find(s =>
      s.dayNum === currentDay && s.hour > currentTime
    );

    // If none left today, find first one later this week
    if (!next) {
      next = sortedServices.find(s => s.dayNum > currentDay);
    }

    // If none left this week, it's the first one next week (Sunday)
    if (!next) {
      next = sortedServices[0];
    }

    return next;
  };

  const nextService = getNextService();

  const handleShareVerse = async () => {
    try {
      await Share.share({
        message: `${DAILY_VERSE.text}\n\n— ${DAILY_VERSE.reference}`,
      });
    } catch {
      // user dismissed
    }
  };

  const handleSaveVerseNote = async () => {
    if (!verseNoteText.trim()) return;
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to save notes.');
      return;
    }
    setSavingVerseNote(true);
    try {
      const { error } = await supabase.from('bible_notes').upsert({
        user_id: user.id,
        book: 'Proverbs',
        chapter: 3,
        verse_start: 5,
        verse_end: 5,
        note: verseNoteText.trim(),
      } as never);
      if (error) throw error;
      setShowVerseNoteModal(false);
      setVerseNoteText('');
    } catch {
      Alert.alert('Error', 'Could not save note. Please try again.');
    } finally {
      setSavingVerseNote(false);
    }
  };

  const fetchHomeData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3);

      if (!eventsError && eventsData) {
        setEvents(eventsData);
        await writeOfflineCache(HOME_CACHE_KEY, { events: eventsData });
        setShowingCachedData(false);
        setOfflineTimestamp(null);
      }
    } catch (err) {
      console.error('Home data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    const restoreCachedHome = async () => {
      const cached = await readOfflineCache<{ events: any[] }>(HOME_CACHE_KEY);
      if (!cached || !isActive) return;
      setEvents(cached.data.events);
      setShowingCachedData(true);
      setOfflineTimestamp(cached.updatedAt);
    };
    void restoreCachedHome();
    void fetchHomeData();
    return () => { isActive = false; };
  }, [fetchHomeData]);

  useEffect(() => {
    Animated.stagger(90, [
      Animated.timing(heroEnter, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.timing(bodyEnter, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroEnter, bodyEnter]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const firstName = user?.full_name?.split(' ')[0] ?? 'Friend';
  const userTimeZone = readProfileTimeZone(user) ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const greeting = getGreetingByHour(getHourForTimeZone(now, userTimeZone));

  // Dynamic Streak Calculation
  const getStreakData = () => {
    const streakCount = user?.streak_count ?? 0;
    const lastRead = user?.streak_last_date ? new Date(user.streak_last_date) : null;
    const now = new Date();

    if (!lastRead) return { count: 0, status: 'Start your journey today!' };

    const daysSinceLastRead = differenceInDays(now, lastRead);

    if (daysSinceLastRead === 0) {
      return { count: streakCount, status: 'You read today! Keep it up.' };
    } else if (daysSinceLastRead === 1) {
      return { count: streakCount, status: "Read today to keep your streak!" };
    } else {
      return { count: 0, status: 'Start a new streak today!' };
    }
  };

  const { count: streak, status: streakStatus } = getStreakData();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: BaseColors.brown900 }}>
        <View style={styles.nav}>
          <View>
            <Text style={styles.navHello}>{greeting}</Text>
            <Text style={styles.navName}>{firstName} 👋</Text>
          </View>
          <View style={styles.navRight}>
            <TouchableOpacity style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={22} color={BaseColors.white} />
              <View style={[styles.notifDot, { backgroundColor: theme.accent }]} />
            </TouchableOpacity>
            <Image source={require('../../../assets/icon.png')} style={styles.logoSmall} resizeMode="contain" />
            <TouchableOpacity
              style={[styles.avatar, { backgroundColor: theme.accent }]}
              onPress={() => navigation.navigate('ProfileTab')}
            >
              <Text style={styles.avatarText}>{user?.full_name?.charAt(0) ?? 'G'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchHomeData} tintColor={theme.accent} />}
      >
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: heroEnter,
              transform: [
                {
                  translateY: heroEnter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
                },
              ],
            },
          ]}
        >
          <LinearGradient colors={[BaseColors.brown900, BaseColors.brown900]} style={StyleSheet.absoluteFillObject} />
          <View style={[styles.glowBlob, { backgroundColor: theme.accentSubtle }]} />
          <View style={styles.verseCard}>
            <Text style={[styles.verseEye, { color: theme.accentBorder }]}>✦ Verse of the day</Text>
            <Text style={styles.verseText}>{DAILY_VERSE.text}</Text>
            <Text style={[styles.verseRef, { color: theme.accentBorder }]}>{DAILY_VERSE.reference}</Text>
            <View style={styles.verseActions}>
              <TouchableOpacity
                style={[styles.verseBtn, { backgroundColor: theme.accent }]}
                onPress={() => { setVerseNoteText(''); setShowVerseNoteModal(true); }}
              >
                <Ionicons name="pencil-outline" size={14} color={BaseColors.white} />
                <Text style={styles.verseBtnText}>Add note</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.verseBtnOutline} onPress={handleShareVerse}>
                <Ionicons name="share-social-outline" size={14} color={BaseColors.white} />
                <Text style={styles.verseBtnOutlineText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            {
              opacity: bodyEnter,
              transform: [
                {
                  translateY: bodyEnter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
                },
              ],
            },
          ]}
        >
        <View style={[styles.streakBand, { backgroundColor: colors.surface === '#ffffff' ? BaseColors.brown800 : colors.card }]}> 
          <Text style={styles.streakFire}>{streak > 0 ? '🔥' : '🌱'}</Text>
          <View style={styles.streakInfo}>
            <Text style={styles.streakTitle}>{streak}-day reading streak</Text>
            <Text style={[styles.streakSub, { color: colors.surface === '#ffffff' ? BaseColors.brown300 : colors.textSecondary }]}>{streakStatus}</Text>
          </View>
        </View>

        <View style={styles.mainContent}>
          {showingCachedData && offlineTimestamp && (
            <View style={[styles.cachedBanner, { borderColor: theme.accentBorder, backgroundColor: theme.accentLight }]}>
              <Ionicons name="cloud-offline-outline" size={14} color={theme.accent} />
              <Text style={[styles.cachedBannerText, { color: theme.accentDeep }]}>
                Showing saved content. {formatOfflineTimestamp(offlineTimestamp)}
              </Text>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick access</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACCESS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.quickItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  if (item.tab) navigation.navigate(item.tab as any);
                  else if (item.screen) navigation.navigate(item.screen as any);
                }}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: item.color + '25' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} style={styles.quickIcon} />
                </View>
                <Text style={[styles.quickLabel, { color: item.color }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Next Service</Text>
          <View style={[styles.serviceWidget, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.serviceRow}>
              <View style={styles.serviceLeft}>
                <Text style={[styles.serviceDay, { color: theme.accent }]}>{nextService?.day}</Text>
                <Text style={[styles.serviceName, { color: colors.text }]}>{nextService?.service}</Text>
              </View>
              <View style={styles.serviceRight}>
                <Text style={[styles.serviceTime, { color: colors.text }]}>{nextService?.time}</Text>
                <View style={[styles.nextServicePill, { backgroundColor: theme.accent }]}>
                  <Text style={styles.nextServiceText}>Upcoming</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming events</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CommunityTab', { screen: 'CommunityHome' })}>
              <Text style={[styles.seeAll, { color: theme.accent }]}>View all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScroll}>
            {events.map((ev, idx) => (
              <AnimatedReanimated.View
                key={ev.id}
                entering={FadeInUp.delay(idx * 80)}
                style={{ marginRight: 14 }}
              >
                <TouchableOpacity style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                  <View style={[styles.eventBanner, { backgroundColor: theme.accent + '22' }]}> 
                    <Ionicons name="business-outline" size={24} color={theme.accent} style={styles.eventIcon} /> 
                  </View> 
                  <View style={styles.eventBody}> 
                    <Text style={[styles.eventTitle, { color: colors.text }]}>{ev.title}</Text> 
                    <Text style={[styles.eventTime, { color: colors.textSecondary }]}>{new Date(ev.start_time).toLocaleDateString()}</Text> 
                  </View> 
                </TouchableOpacity>
              </AnimatedReanimated.View>
            ))}
          </ScrollView>
        </View>
        </Animated.View>
      </Animated.ScrollView>

      {/* Verse note modal */}
      <RNModal
        isVisible={showVerseNoteModal}
        onBackdropPress={() => setShowVerseNoteModal(false)}
        onBackButtonPress={() => setShowVerseNoteModal(false)}
        style={{ margin: 0, justifyContent: 'flex-end' }}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        useNativeDriver
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={[styles.noteModalSafe, { backgroundColor: colors.background }]}> 
            <View style={[styles.noteModalHeader, { borderBottomColor: colors.border }]}> 
              <Text style={[styles.noteModalTitle, { color: colors.text }]}>Add note</Text> 
              <TouchableOpacity onPress={() => setShowVerseNoteModal(false)}> 
                <Ionicons name="close" size={24} color={colors.text} /> 
              </TouchableOpacity> 
            </View> 
            <View style={styles.noteModalBody}> 
              <Text style={[styles.noteModalRef, { color: colors.textSecondary }]}>{DAILY_VERSE.reference} — Verse of the day</Text> 
              <Text style={[styles.noteModalVerse, { color: colors.text }]}>{DAILY_VERSE.text}</Text> 
              <TextInput 
                style={[styles.noteModalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} 
                value={verseNoteText} 
                onChangeText={setVerseNoteText} 
                placeholder="Write your thoughts on this verse…" 
                placeholderTextColor={colors.textMuted} 
                multiline 
                autoFocus 
              /> 
              <TouchableOpacity 
                style={[styles.noteModalSaveBtn, { backgroundColor: theme.accent, opacity: savingVerseNote ? 0.6 : 1 }]} 
                onPress={handleSaveVerseNote} 
                disabled={savingVerseNote} 
              > 
                <Text style={styles.noteModalSaveBtnText}>{savingVerseNote ? 'Saving…' : 'Save note'}</Text> 
              </TouchableOpacity> 
            </View> 
          </SafeAreaView> 
        </KeyboardAvoidingView> 
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  navHello: { fontFamily: Typography.sansMedium, fontSize: Typography.sizes.xs, color: BaseColors.brown200, letterSpacing: 0.4 },
  navName: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.white },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  notifBtn: { position: 'relative', padding: 4 },
  notifDot: { position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: BaseColors.brown900 },
  logoSmall: { width: 28, height: 28 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  avatarText: { fontFamily: Typography.sansSemiBold, fontSize: 13, color: BaseColors.white },
  heroSection: { backgroundColor: BaseColors.brown900, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, position: 'relative', overflow: 'hidden' },
  glowBlob: { position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: 75 },
  verseCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: BaseColors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  verseEye: { fontFamily: Typography.sansSemiBold, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: Spacing.sm },
  verseText: { fontFamily: Typography.serifItalic, fontSize: Typography.sizes.md, color: BaseColors.white, lineHeight: 24, marginBottom: Spacing.sm },
  verseRef: { fontFamily: Typography.sans, fontSize: Typography.sizes.sm, marginBottom: Spacing.md },
  verseActions: { flexDirection: 'row', gap: Spacing.sm },
  verseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.sm, paddingVertical: 7, paddingHorizontal: 12 },
  verseBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.white },
  verseBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.sm, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  verseBtnOutlineText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.white },
  streakBand: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.sm },
  streakFire: { fontSize: 20 },
  streakInfo: { flex: 1 },
  streakTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.white },
  streakSub: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs, marginTop: 2 },
  mainContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing['2xl'] },
  cachedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, marginBottom: Spacing.lg },
  cachedBannerText: { flex: 1, fontFamily: Typography.sansMedium, fontSize: Typography.sizes.sm },
  sectionTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, marginBottom: Spacing.md, letterSpacing: 0.2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  seeAll: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs, letterSpacing: 0.5, textTransform: 'uppercase' },
  quickGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  quickItem: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
  },
  quickIcon: { opacity: 0.95 },
  quickIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontFamily: Typography.sansSemiBold, fontSize: 11, letterSpacing: 0.2 },
  serviceWidget: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    shadowColor: BaseColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  serviceLeft: { flex: 1 },
  serviceDay: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  serviceName: { fontFamily: Typography.sans, fontSize: 11 },
  serviceRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  serviceTime: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  nextServicePill: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  nextServiceText: { fontFamily: Typography.sansSemiBold, fontSize: 9, color: BaseColors.white },
  noteModalSafe: { flex: 1 },
  noteModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  noteModalTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.lg },
  noteModalBody: { flex: 1, padding: Spacing.xl },
  noteModalRef: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, marginBottom: Spacing.sm },
  noteModalVerse: { fontFamily: Typography.serifItalic, fontSize: Typography.sizes.sm, lineHeight: 22, marginBottom: Spacing.lg },
  noteModalInput: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, minHeight: 120, fontSize: Typography.sizes.base, fontFamily: Typography.sans, textAlignVertical: 'top', marginBottom: Spacing.lg },
  noteModalSaveBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  noteModalSaveBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base, color: BaseColors.white },
  eventsScroll: { gap: Spacing.md, paddingRight: Spacing.xl, marginBottom: Spacing.xl },
  eventCard: {
    width: 152,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: BaseColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  eventBanner: { height: 60, alignItems: 'center', justifyContent: 'center' },
  eventIcon: { opacity: 0.95 },
  eventBody: { padding: Spacing.sm },
  eventTitle: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, lineHeight: 17 },
  eventTime: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs, marginTop: 2 },
});
