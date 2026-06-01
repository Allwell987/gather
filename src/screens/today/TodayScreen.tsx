// src/screens/today/TodayScreen.tsx
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Linking, RefreshControl, Share, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HeaderBar from '../../components/common/HeaderBar';
import AnimatedEntrance from '../../components/common/AnimatedEntrance';
import Pulse from '../../components/common/Pulse';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import { useLiveStatus } from '../../hooks/useLiveStatus';
import { useDevotional } from './hooks/useDevotional';
import DevotionalCard from '../../components/devotional/DevotionalCard';
import { formatAppDate, getDeviceLocale, t } from '../../services/locale';

export default function TodayScreen() {
  const { theme, colors } = useThemeStore();
  const { user } = useAuthStore();
  const { isLive, activeLive } = useLiveStatus();
  const { devotional, isLoading, hasReadToday, markAsRead, isMarking } = useDevotional();
  const locale = getDeviceLocale();

  const handleShare = () => {
    if (devotional) Share.share({ message: `"${devotional.title}"\n— ${devotional.anchor_scripture}` });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title={t('today', locale)}
        subtitle={formatAppDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }, locale)}
        showBack={false}
        enableBlur
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLive && activeLive && (
          <TouchableOpacity style={[styles.live, { backgroundColor: theme.accent }]} onPress={() => activeLive.live_url && Linking.openURL(activeLive.live_url)}>
            <Pulse scale={1.05} duration={800}>
              <Ionicons name="radio" size={18} color="#fff" />
            </Pulse>
            <Text style={styles.liveText}>{t('liveLabel', locale)} {activeLive.title}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          <AnimatedEntrance delay={100}>
            <Text style={styles.sectionTitle}>{t('dailyDevotional', locale)}</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {isLoading ? (
                <ActivityIndicator size="large" color={theme.accent} style={{ padding: 40 }} />
              ) : devotional ? (
                <DevotionalCard
                  devotional={devotional}
                  onShare={handleShare}
                  onMarkRead={() => markAsRead()}
                  hasReadToday={hasReadToday}
                  isMarking={isMarking}
                  colors={colors}
                  accent={theme.accent}
                />
              ) : <Text>{t('noDevotionalToday', locale)}</Text>}
            </View>
          </AnimatedEntrance>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 40 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, margin: Spacing.xl, borderRadius: Radius.md },
  liveText: { color: '#fff', fontWeight: 'bold' },
  content: { padding: Spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  card: { padding: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1 },
  devoTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  devoRef: { color: 'gray', textTransform: 'uppercase', fontSize: 10, letterSpacing: 1, marginBottom: 16 },
  devoBody: { fontSize: 16, lineHeight: 26 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  readBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full },
  section: { marginTop: 12 },
  sectionHeading: { fontSize: 13, fontWeight: '700', marginBottom: 6, color: BaseColors.grayDark },
  sectionText: { fontSize: 15, lineHeight: 22 },
  scriptureItem: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
});
