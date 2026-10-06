// src/screens/prayer/PrayerWallScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ActivityIndicator,
  Animated, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { useThemeStore } from '../../store/themeStore';
import { HeaderBar } from '../../components/common';
import { formatOfflineTimestamp } from '../../services/offlineCache';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import { usePrayers } from '../../hooks/usePrayers';
import { PrayerStats } from './components/PrayerStats';
import { PrayerTabs } from './components/PrayerTabs';
import { PrayerCard } from './components/PrayerCard';
import { PrayerComposeModal } from './components/PrayerComposeModal';
import { t, getDeviceLocale } from '../../services/locale';

interface PrayerWallScreenProps {
  hideHeader?: boolean;
  externalShowCompose?: boolean;
  onCloseExternalCompose?: () => void;
}

export default function PrayerWallScreen({
  hideHeader = false,
  externalShowCompose,
  onCloseExternalCompose,
}: PrayerWallScreenProps) {
  const { theme, colors } = useThemeStore();
  const locale = getDeviceLocale();
  const {
    activeTab,
    setActiveTab,
    prayers,
    newPrayerText,
    setNewPrayerText,
    composeError,
    selectedCategory,
    setSelectedCategory,
    isAnonymous,
    setIsAnonymous,
    loading,
    submitting,
    showingCachedData,
    offlineTimestamp,
    showSuccessAnimation,
    showCompose,
    setShowCompose,
    submitPrayer,
    togglePraying,
    handleMarkAsAnswered,
  } = usePrayers();

  const [headerOpacity] = useState(() => new Animated.Value(0));
  const [listOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (externalShowCompose) {
      setShowCompose(true);
    }
  }, [externalShowCompose, setShowCompose]);

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
  }, [headerOpacity, listOpacity]);

  const filteredPrayers = prayers.filter((p) => {
    if (activeTab === 'Mine') return p.isMyRequest;
    if (activeTab === 'Answered') return p.status === 'answered';
    if (activeTab === 'Urgent') return p.status === 'urgent';
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!hideHeader && (
        <HeaderBar
          title={t('prayerWall', locale)}
          subtitle="The Wealth Reality Church"
          enableBlur={true}
          showBack={false}
          rightAction={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setShowCompose(true);
          }}
          rightIcon="add"
        />
      )}

      <SafeAreaView edges={[]} style={{ backgroundColor: 'transparent' }}>
        <PrayerStats
          prayers={prayers}
          theme={theme}
          colors={colors}
          headerOpacity={headerOpacity}
        />

        <PrayerTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          theme={theme}
          colors={colors}
          headerOpacity={headerOpacity}
        />
      </SafeAreaView>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        style={{ opacity: listOpacity }}
        keyboardDismissMode="on-drag"
      >
        {showingCachedData && offlineTimestamp && (
          <View style={[styles.cachedBanner, { borderColor: theme.accentBorder, backgroundColor: theme.accentLight }]}>
            <Ionicons name="cloud-offline-outline" size={14} color={theme.accent} />
            <Text style={[styles.cachedBannerText, { color: theme.accentDeep }]}>
              {t('showingSavedRequests', locale)} {formatOfflineTimestamp(offlineTimestamp)}
            </Text>
          </View>
        )}

        {loading && prayers.length === 0 && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={theme.accent} />
          </View>
        )}

        {!loading && filteredPrayers.length === 0 && (
          <TouchableOpacity
            style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              setShowCompose(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles-outline" size={24} color={theme.accent} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>{t('noPrayerRequests', locale)}</Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              {activeTab === 'Mine'
                ? t('noMineRequests', locale)
                : activeTab === 'Answered'
                  ? t('noAnsweredRequests', locale)
                  : activeTab === 'Urgent'
                    ? t('noUrgentRequests', locale)
                    : t('beFirstPrayer', locale)}
            </Text>
            <View style={[styles.emptyStateButton, { backgroundColor: theme.accent }]}>
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.emptyStateButtonText}>{t('postRequest', locale)}</Text>
            </View>
          </TouchableOpacity>
        )}

        {filteredPrayers.map((prayer) => (
          <PrayerCard
            key={prayer.id}
            prayer={prayer}
            theme={theme}
            colors={colors}
            onTogglePraying={togglePraying}
            onMarkAsAnswered={handleMarkAsAnswered}
          />
        ))}
      </Animated.ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          setShowCompose(true);
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('addPrayerRequest', locale)}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      <PrayerComposeModal
        visible={showCompose}
        onClose={() => {
          setShowCompose(false);
          onCloseExternalCompose?.();
        }}
        onSubmit={submitPrayer}
        newPrayerText={newPrayerText}
        setNewPrayerText={setNewPrayerText}
        composeError={composeError}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        isAnonymous={isAnonymous}
        setIsAnonymous={setIsAnonymous}
        submitting={submitting}
        theme={theme}
        colors={colors}
      />

      {/* Success Animation Overlay */}
      <Modal
        visible={showSuccessAnimation}
        transparent
        animationType="fade"
      >
        <View style={styles.animationOverlay}>
          <View style={styles.animationContainer}>
            <LottieView
              source={require('../../../assets/animations/success-check.json')}
              autoPlay
              loop={false}
              style={styles.successLottie}
            />
            <Text style={styles.successTitle}>{t('requestPosted', locale)}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 90 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 999,
  },
  cachedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: Radius.md, padding: 10, marginBottom: Spacing.sm },
  cachedBannerText: { flex: 1, fontFamily: Typography.sansMedium, fontSize: Typography.sizes.sm },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.sm,
  },
  emptyStateTitle: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.md,
  },
  emptyStateText: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingState: { alignItems: 'center', padding: Spacing.xl },
  animationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationContainer: {
    backgroundColor: BaseColors.white,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  successLottie: {
    width: 150,
    height: 150,
  },
  successTitle: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes.lg,
    color: BaseColors.brown900,
    marginTop: Spacing.md,
  },
});
