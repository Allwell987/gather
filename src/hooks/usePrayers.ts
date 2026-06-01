import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useThemeStore } from '../store/themeStore';
import {
  readOfflineCache,
  writeOfflineCache,
} from '../services/offlineCache';
import { t } from '../services/locale';
import {
  enqueueOfflineAction,
  getQueuedOfflineActions,
  shouldQueueOfflineAction,
  type CreatePrayerOfflineAction,
} from '../services/offlineActionQueue';
import { BaseColors } from '../constants/theme';
import type {
  PrayerRequest as DBPrayerRequest,
  PrayerRequestWithProfile,
  PrayerCategory,
} from '../types/database';
import type { FilterTab, PrayerRequestUI } from '../screens/prayer/types';

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

const computeTimeAgo = (timestamp: string) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const usePrayers = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [prayers, setPrayers] = useState<PrayerRequestUI[]>([]);
  const [newPrayerText, setNewPrayerText] = useState('');
  const [composeError, setComposeError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PrayerCategory>('Health');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showingCachedData, setShowingCachedData] = useState(false);
  const [offlineTimestamp, setOfflineTimestamp] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

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
      if (__DEV__) {
        console.error('loadPrayers error', err);
      }
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

  const togglePraying = (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {
        // Ignore haptic errors
      }
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 2500);
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
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        showToast({
          title: t('savedOfflineTitle'),
          message: t('savedOfflinePrayer'),
          variant: 'warning',
        });
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setComposeError('Could not post prayer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    prayers,
    newPrayerText,
    setNewPrayerText,
    composeError,
    setComposeError,
    selectedCategory,
    setSelectedCategory,
    isAnonymous,
    setIsAnonymous,
    loading,
    submitting,
    showingCachedData,
    offlineTimestamp,
    showSuccessAnimation,
    setShowSuccessAnimation,
    showCompose,
    setShowCompose,
    loadPrayers,
    submitPrayer,
    togglePraying,
    handleMarkAsAnswered,
  };
};
