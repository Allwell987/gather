// src/screens/prayer/PrayerWallScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import {
  formatOfflineTimestamp,
  readOfflineCache,
  writeOfflineCache,
} from '../../services/offlineCache';
import {
  enqueueOfflineAction,
  getQueuedOfflineActions,
  shouldQueueOfflineAction,
  type CreatePrayerOfflineAction,
} from '../../services/offlineActionQueue';
import { supabase } from '../../services/supabase';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import { useMutation } from '@tanstack/react-query';
import type {
  PrayerRequest as DBPrayerRequest,
  PrayerRequestWithProfile,
  PrayerCategory,
} from '../../types/database';

type FilterTab = 'All' | 'Mine' | 'Answered' | 'Urgent';

interface PrayerRequestUI {
  id: string;
  name: string;
  initials: string;
  avatarColor?: string;
  isAnonymous: boolean;
  category: PrayerCategory;
  text: string;
  timeAgo: string;
  prayingCount: number;
  replyCount: number;
  status: 'open' | 'answered' | 'urgent';
  isMyRequest?: boolean;
  userPraying?: boolean;
  syncStatus?: 'pending';
}

const CATEGORIES: PrayerCategory[] = ['Health', 'Family', 'Provision', 'Studies', 'Missions', 'Testimony'];
const PRAYER_CACHE_KEY = 'prayer-wall';

const mergePrayerRequests = (items: PrayerRequestUI[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
};

export default function PrayerWallScreen() {
  const { theme, colors } = useThemeStore();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [prayers, setPrayers] = useState<PrayerRequestUI[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [newPrayerText, setNewPrayerText] = useState('');
  const [composeError, setComposeError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PrayerCategory>('Health');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showingCachedData, setShowingCachedData] = useState(false);
  const [offlineTimestamp, setOfflineTimestamp] = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getQueuedPrayerRequests = useCallback(async () => {
    const queuedActions = await getQueuedOfflineActions();

    return queuedActions
      .filter((action): action is CreatePrayerOfflineAction => action.type === 'create_prayer')
      .filter((action) => action.payload.userId === user?.id)
      .map((action): PrayerRequestUI => {
        const name = action.payload.isAnonymous ? 'Anonymous' : action.payload.fullName || 'Guest';

        return {
          id: action.id,
          name,
          initials: action.payload.isAnonymous
            ? '?'
            : name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'G',
          avatarColor: action.payload.isAnonymous ? BaseColors.brown200 : theme.accent,
          isAnonymous: action.payload.isAnonymous,
          category: (action.payload.category.charAt(0).toUpperCase() + action.payload.category.slice(1)) as PrayerCategory,
          text: action.payload.text,
          timeAgo: 'Sending when online',
          prayingCount: 0,
          replyCount: 0,
          status: 'open' as const,
          isMyRequest: action.payload.userId === user?.id,
          userPraying: false,
          syncStatus: 'pending' as const,
        };
      });
  }, [theme.accent, user?.id]);

  const loadPrayers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: prayerData, error } = await supabase
        .from('prayer_requests')
        .select(`
          *,
          profile:user_id(full_name, avatar_url, is_verified)
        `)
        .order('created_at', { ascending: false })
        .limit(50)
        .returns<PrayerRequestWithProfile[]>();

      if (error) {
        throw error;
      } else if (prayerData) {
        const mapped: PrayerRequestUI[] = prayerData.map((item) => ({
          id: item.id,
          name: item.is_anonymous ? 'Anonymous' : item.profile?.full_name ?? 'Guest',
          initials: item.is_anonymous
            ? '?'
            : item.profile?.full_name?.split(' ').map((n: string) => n[0]).join('') ?? 'G',
          avatarColor: item.is_anonymous ? BaseColors.brown200 : undefined,
          isAnonymous: item.is_anonymous,
          category: item.category || 'Health',
          text: item.description ?? item.title ?? '',
          timeAgo: computeTimeAgo(item.created_at),
          prayingCount: item.prayer_count ?? 0,
          replyCount: 0,
          status: item.status || 'open',
          isMyRequest: item.user_id === user?.id,
          userPraying: false,
        }));
        const queuedPrayers = await getQueuedPrayerRequests();
        const merged = mergePrayerRequests([...queuedPrayers, ...mapped]);
        setPrayers(merged);
        await writeOfflineCache(PRAYER_CACHE_KEY, merged);
        setShowingCachedData(false);
        setOfflineTimestamp(null);
      }
    } catch (err) {
      console.error('loadPrayers error', err);
      const cached = await readOfflineCache<PrayerRequestUI[]>(PRAYER_CACHE_KEY);
      const queuedPrayers = await getQueuedPrayerRequests();

      if (cached || queuedPrayers.length > 0) {
        setPrayers(mergePrayerRequests([...(queuedPrayers ?? []), ...(cached?.data ?? [])]));
        setShowingCachedData(true);
        setOfflineTimestamp(cached?.updatedAt ?? new Date().toISOString());
      }
    } finally {
      setLoading(false);
    }
  }, [getQueuedPrayerRequests, user?.id]);

  useEffect(() => {
    let isActive = true;
    const restoreCachedPrayers = async () => {
      const cached = await readOfflineCache<PrayerRequestUI[]>(PRAYER_CACHE_KEY);
      if (!cached || !isActive) return;
      setPrayers(cached.data);
      setShowingCachedData(true);
      setOfflineTimestamp(cached.updatedAt);
    };
    void restoreCachedPrayers();
    void loadPrayers();

    const subscription = supabase
      .channel('public:prayer_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_requests' }, () => {
        void loadPrayers();
      })
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(subscription);
    };
  }, [loadPrayers]);

  const computeTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const TABS: FilterTab[] = ['All', 'Mine', 'Answered', 'Urgent'];

  const filteredPrayers = prayers.filter((p) => {
    if (activeTab === 'Mine') return p.isMyRequest;
    if (activeTab === 'Answered') return p.status === 'answered';
    if (activeTab === 'Urgent') return p.status === 'urgent';
    return true;
  });

  const togglePraying = (id: string) => {
    setPrayers((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      return {
        ...p,
        userPraying: !p.userPraying,
        prayingCount: p.userPraying ? p.prayingCount - 1 : p.prayingCount + 1,
      };
    }));
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'answered' | 'open' }) => {
      const { error } = await supabase
        .from('prayer_requests')
        .update({ status } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast({ title: 'Status updated', message: 'The prayer status has been updated.', variant: 'success' });
      void loadPrayers();
    },
    onError: () => {
      Alert.alert('Error', 'Could not update prayer status. Please try again.');
    },
  });

  const handleMarkAsAnswered = (id: string) => {
    Alert.alert(
      'Prayer Answered? 🙌',
      'Would you like to mark this prayer request as answered and share the testimony?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Praise God!',
          onPress: () => updateStatusMutation.mutate({ id, status: 'answered' })
        },
      ]
    );
  };

  const submitPrayer = async () => {
    if (!newPrayerText.trim()) {
      setComposeError('Please share what you need prayer for.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Not signed in', 'Please sign in to post a prayer request.');
      return;
    }

    setSubmitting(true);
    setComposeError(null);

    try {
      const trimmedText = newPrayerText.trim();
      const ownsName = isAnonymous ? 'Anonymous' : user.full_name ?? 'Guest';

      const { data, error } = await supabase
        .from('prayer_requests')
        .insert({
          user_id: user.id,
          category: selectedCategory,
          title: trimmedText.slice(0, 80),
          description: trimmedText,
          is_anonymous: isAnonymous,
          prayer_count: 0,
          status: 'open',
        } as never)
        .select('*')
        .returns<DBPrayerRequest[]>()
        .single();

      if (error || !data) throw error;

      const newPrayer: PrayerRequestUI = {
        id: (data as DBPrayerRequest).id,
        name: isAnonymous ? 'Anonymous' : ownsName,
        initials: isAnonymous ? '?' : (ownsName?.charAt(0) ?? 'G'),
        avatarColor: isAnonymous ? BaseColors.brown200 : theme.accent,
        isAnonymous,
        category: selectedCategory,
        text: trimmedText,
        timeAgo: 'Just now',
        prayingCount: 0,
        replyCount: 0,
        status: 'open',
        isMyRequest: true,
      };

      setPrayers((prev) => [newPrayer, ...prev]);
      setNewPrayerText('');
      setShowCompose(false);
      showToast({ title: 'Prayer posted', message: 'Your request is live on the wall.', variant: 'success' });
    } catch (err) {
      if (await shouldQueueOfflineAction(err)) {
        const trimmedText = newPrayerText.trim();
        const ownsName = isAnonymous ? 'Anonymous' : user.full_name ?? 'Guest';
        const queuedAction = await enqueueOfflineAction({
          type: 'create_prayer',
          payload: {
            userId: user.id,
            fullName: user.full_name ?? 'Guest',
            category: selectedCategory,
            text: trimmedText,
            isAnonymous,
          },
        });

        const queuedPrayer: PrayerRequestUI = {
          id: queuedAction.id,
          name: ownsName,
          initials: isAnonymous ? '?' : (ownsName?.charAt(0) ?? 'G'),
          avatarColor: isAnonymous ? BaseColors.brown200 : theme.accent,
          isAnonymous,
          category: selectedCategory,
          text: trimmedText,
          timeAgo: 'Sending when online',
          prayingCount: 0,
          replyCount: 0,
          status: 'open',
          isMyRequest: true,
          syncStatus: 'pending',
        };

        setPrayers((prev) => mergePrayerRequests([queuedPrayer, ...prev]));
        setNewPrayerText('');
        setShowCompose(false);
        showToast({
          title: 'Saved offline',
          message: 'Your prayer request will post when you are back online.',
          variant: 'warning',
        });
        return;
      }
      setComposeError('Could not post prayer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }] }>
      <SafeAreaView edges={['top']} style={{ backgroundColor: BaseColors.brown900 }}>
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <View>
            <Text style={styles.headerTitle}>Prayer Wall</Text>
            <Text style={styles.headerSub}>The Wealth Reality Church</Text>
          </View>
          <TouchableOpacity
            style={[styles.composeBtn, { backgroundColor: theme.accent }]}
            onPress={() => {
              setComposeError(null);
              setShowCompose(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Compose prayer request"
          >
            <Ionicons name="add" size={24} color={BaseColors.white} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.statsRow, { backgroundColor: colors.border, opacity: headerOpacity }] }>
          <View style={[styles.stat, { backgroundColor: theme.accentLight }]}>
            <Text style={[styles.statNum, { color: theme.accentDeep }]}>{prayers.length + 12}</Text>
            <Text style={[styles.statLabel, { color: theme.accent }]}>Prayers today</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.card }] }>
            <Text style={[styles.statNum, { color: colors.text }]}>{prayers.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Requests</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.card }] }>
            <Text style={[styles.statNum, { color: colors.text }]}>{prayers.filter(p => p.status === 'answered').length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Answered 🙏</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border, opacity: headerOpacity }] }>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { borderBottomColor: theme.accent }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                { color: colors.textSecondary },
                activeTab === tab && { color: theme.accent, fontFamily: Typography.sansSemiBold },
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </SafeAreaView>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        style={{ opacity: listOpacity }}
      >
        {showingCachedData && offlineTimestamp && (
          <View style={[styles.cachedBanner, { borderColor: theme.accentBorder, backgroundColor: theme.accentLight }]}>
            <Ionicons name="cloud-offline-outline" size={14} color={theme.accent} />
            <Text style={[styles.cachedBannerText, { color: theme.accentDeep }]}>
              Showing saved requests. {formatOfflineTimestamp(offlineTimestamp)}
            </Text>
          </View>
        )}

        {loading && prayers.length === 0 && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={theme.accent} />
          </View>
        )}

        {!loading && filteredPrayers.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }] }>
            <Ionicons name="sparkles-outline" size={24} color={theme.accent} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No prayer requests yet</Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }] }>
              {activeTab === 'Mine'
                ? 'You have not posted any requests yet. Tap + to share one.'
                : activeTab === 'Answered'
                  ? 'No answered requests yet. Keep praying with the church family.'
                  : activeTab === 'Urgent'
                    ? 'No urgent requests right now.'
                    : 'Be the first to post a prayer request and encourage others.'}
            </Text>
          </View>
        )}

        {filteredPrayers.map((prayer) => (
          <View key={prayer.id} style={[styles.prayerCard, { backgroundColor: colors.card, borderColor: colors.border }] }>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: prayer.avatarColor ?? theme.accent }]}>
                {prayer.isAnonymous ? (
                  <Ionicons name="person" size={16} color={BaseColors.white} />
                ) : (
                  <Text style={styles.avatarText}>{prayer.initials}</Text>
                )}
              </View>
              <View style={styles.cardMeta}>
                <Text style={[styles.requesterName, { color: colors.text }]}>{prayer.name}</Text>
                <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>{prayer.timeAgo}</Text>
              </View>
              {prayer.status === 'answered' && (
                <View style={[styles.answeredBadge, { backgroundColor: BaseColors.sage }]}>
                  <Ionicons name="checkmark-circle" size={12} color={BaseColors.white} />
                  <Text style={styles.answeredBadgeText}>Answered</Text>
                </View>
              )}
            </View>

            <View style={[styles.categoryChip, { backgroundColor: theme.accentLight }] }>
              <Text style={[styles.categoryText, { color: theme.accentDeep }]}>{prayer.category}</Text>
            </View>

            <Text style={[styles.prayerText, { color: colors.text }]}>{prayer.text}</Text>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  prayer.userPraying && { backgroundColor: theme.accentLight, borderColor: theme.accentBorder },
                ]}
                onPress={() => togglePraying(prayer.id)}
                accessibilityRole="button"
                accessibilityLabel={`Toggle praying for request from ${prayer.name}`}
              >
                <Text style={[styles.actionBtnText, { color: colors.textSecondary }, prayer.userPraying && { color: theme.accent }]}>
                  🙏 {prayer.prayingCount} praying
                </Text>
              </TouchableOpacity>

              {prayer.isMyRequest && prayer.status === 'open' && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: theme.accentBorder }]}
                  onPress={() => handleMarkAsAnswered(prayer.id)}
                >
                  <Text style={[styles.actionBtnText, { color: theme.accent }]}>Mark as Answered 🙌</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      <Modal visible={showCompose} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }] }>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }] }>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Share a prayer request</Text>
              <TouchableOpacity
                onPress={() => setShowCompose(false)}
                accessibilityRole="button"
                accessibilityLabel="Close prayer request composer"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.composeBody}>
              <Text style={[styles.composeLabel, { color: colors.textSecondary }]}>Category</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      { borderColor: colors.border, backgroundColor: colors.card },
                      selectedCategory === cat && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        { color: colors.textSecondary },
                        selectedCategory === cat && { color: BaseColors.white },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputSection}>
                <Text style={[styles.composeLabel, { color: colors.textSecondary }]}>Your request</Text>
                <TextInput
                  style={[
                    styles.composeInput,
                    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                    composeError && styles.inputError,
                  ]}
                  value={newPrayerText}
                  onChangeText={(t) => {
                    setNewPrayerText(t);
                    if (composeError) setComposeError(null);
                  }}
                  placeholder="Share what you need prayer for…"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
                {composeError && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color={BaseColors.red500} />
                    <Text style={styles.errorText}>{composeError}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.anonRow} onPress={() => setIsAnonymous(!isAnonymous)}>
                <View
                  style={[
                    styles.anonToggle,
                    { borderColor: colors.border },
                    isAnonymous && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                >
                  {isAnonymous && <Ionicons name="checkmark" size={14} color={BaseColors.white} />}
                </View>
                <View>
                  <Text style={[styles.anonLabel, { color: colors.text }]}>Post anonymously</Text>
                  <Text style={[styles.anonSub, { color: colors.textSecondary }]}>Your name won&apos;t be shown to others</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.accent }]}
                onPress={submitPrayer}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={BaseColors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Post prayer request 🙏</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BaseColors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  headerTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.white },
  headerSub: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs, color: BaseColors.brown300 },
  composeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statsRow: {
    flexDirection: 'row', gap: 1, backgroundColor: BaseColors.brown100,
    marginHorizontal: Spacing.xl, borderRadius: Radius.md, overflow: 'hidden',
  },
  stat: { flex: 1, backgroundColor: BaseColors.white, padding: Spacing.md, alignItems: 'center' },
  statNum: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.brown900 },
  statLabel: { fontFamily: Typography.sans, fontSize: 10, color: BaseColors.brown400, marginTop: 2, textTransform: 'uppercase' },
  tabs: {
    flexDirection: 'row', backgroundColor: BaseColors.white, borderBottomWidth: 1, borderBottomColor: BaseColors.brown100,
    paddingHorizontal: Spacing.xl, marginTop: Spacing.md,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontFamily: Typography.sansMedium, fontSize: Typography.sizes.sm, color: BaseColors.brown300 },
  list: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 40 },
  cachedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: Radius.md, padding: 10, marginBottom: Spacing.sm },
  cachedBannerText: { flex: 1, fontFamily: Typography.sansMedium, fontSize: Typography.sizes.sm },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: BaseColors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: BaseColors.brown100,
    padding: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptyStateTitle: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.md,
    color: BaseColors.brown900,
  },
  emptyStateText: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    color: BaseColors.brown400,
    textAlign: 'center',
    lineHeight: 20,
  },
  prayerCard: { backgroundColor: BaseColors.white, borderRadius: Radius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: BaseColors.brown100 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Typography.sansSemiBold, fontSize: 13, color: BaseColors.white },
  cardMeta: { flex: 1 },
  requesterName: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.brown900 },
  timeAgo: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs, color: BaseColors.brown300 },
  categoryChip: { backgroundColor: BaseColors.warm100, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: Spacing.sm },
  categoryText: { fontFamily: Typography.sansSemiBold, fontSize: 10, color: BaseColors.gold },
  prayerText: { fontFamily: Typography.sans, fontSize: Typography.sizes.base, color: BaseColors.brown700, lineHeight: 22, marginBottom: Spacing.md },
  cardActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: BaseColors.brown100, backgroundColor: BaseColors.warm50 },
  actionBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs, color: BaseColors.brown400 },
  loadingState: { alignItems: 'center', padding: Spacing.xl },
  modalSafe: { flex: 1, backgroundColor: BaseColors.cream },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: BaseColors.brown100 },
  modalTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.brown900 },
  composeBody: { padding: Spacing.xl, gap: Spacing.xl },
  composeLabel: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs, letterSpacing: 0.8, textTransform: 'uppercase', color: BaseColors.brown400 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catChip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: BaseColors.brown100, backgroundColor: BaseColors.white },
  catChipText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm, color: BaseColors.brown400 },
  inputSection: { gap: Spacing.sm },
  composeInput: { backgroundColor: BaseColors.white, borderWidth: 1.5, borderColor: BaseColors.brown100, borderRadius: Radius.lg, padding: Spacing.xl, minHeight: 140, fontFamily: Typography.sans, fontSize: Typography.sizes.md, color: BaseColors.brown900, textAlignVertical: 'top' },
  inputError: { borderColor: BaseColors.red500 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText: { fontFamily: Typography.sans, fontSize: 12, color: BaseColors.red500 },
  anonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  anonToggle: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: BaseColors.brown200, alignItems: 'center', justifyContent: 'center' },
  anonLabel: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base, color: BaseColors.brown900 },
  anonSub: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs, color: BaseColors.brown400 },
  submitBtn: { borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  submitBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, color: BaseColors.white },
  answeredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  answeredBadgeText: { fontFamily: Typography.sansSemiBold, fontSize: 10, color: BaseColors.white, textTransform: 'uppercase' },
});
