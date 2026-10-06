// src/screens/community/CommunityScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Linking, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HeaderBar from '../../components/common/HeaderBar';
import { useThemeStore } from '../../store/themeStore';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { BaseColors, Typography, Spacing, Radius, CHURCH } from '../../constants/theme';
import EmptyState from '../../components/common/EmptyState';
import PrayerWallScreen from '../prayer/PrayerWallScreen';
import EventsScreen from '../events/EventsScreen';
import { useLiveStatus } from '../../hooks/useLiveStatus';
import { t, getDeviceLocale } from '../../services/locale';
import type { CommunityScreenNavigationProp } from '../../types/navigation';

type CommunityTab = 'Wall' | 'Events';

export default function CommunityScreen() {
  const navigation = useNavigation<CommunityScreenNavigationProp>();
  const locale = getDeviceLocale();
  const { user } = useAuthStore();
  const { theme, colors } = useThemeStore();
  const [activeTab, setActiveTab] = useState<CommunityTab>('Wall');
  const [showWallCompose, setShowWallCompose] = useState(false);

  const { isLive, activeLive } = useLiveStatus();

  const handleJoinLive = () => {
    if (activeLive?.live_url) Linking.openURL(activeLive.live_url).catch(() => Alert.alert(t('error', locale), t('couldNotOpenStream', locale)));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title={t('community', locale)}
        subtitle={CHURCH.name}
        enableBlur
        showBack={false}
        rightIcon={activeTab === 'Wall' ? 'add' : undefined}
        rightAction={activeTab === 'Wall' ? () => setShowWallCompose(true) : undefined}
      />

      <View style={styles.tabBar}>
        {(['Wall', 'Events'] as CommunityTab[]).map(tab => {
          const label = tab === 'Wall' ? t('wall', locale) : t('eventsTab', locale);
          return (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && { backgroundColor: theme.accent }]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab !== tab && { color: 'rgba(255,255,255,0.6)' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {isLive && (
          <TouchableOpacity style={[styles.liveBanner, { backgroundColor: theme.accent }]} onPress={handleJoinLive}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('liveLabel', locale)} {activeLive?.title}</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        )}
        {activeTab === 'Wall' ? (
          <PrayerWallScreen
            hideHeader
            externalShowCompose={showWallCompose}
            onCloseExternalCompose={() => setShowWallCompose(false)}
          />
        ) : (
          <EventsScreen hideHeader />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: BaseColors.brown900, padding: 8, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.full },
  tabText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  liveBanner: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, alignItems: 'center' },
});
