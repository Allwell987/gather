// src/screens/home/HomeScreen.tsx
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, RefreshControl, Share
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderBar from '../../components/common/HeaderBar';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { BaseColors, Typography, Spacing, Radius, DAILY_VERSE } from '../../constants/theme';
import { useHome } from './hooks/useHome';
import type { HomeScreenNavigationProp } from '../../types/navigation';

const QUICK_ACCESS = [
  { id: 'bible', label: 'Bible', icon: 'book-outline', tab: 'BibleTab', color: '#4A90A4' },
  { id: 'community', label: 'Community', icon: 'people-outline', tab: 'CommunityTab', color: '#9B59B6' },
  { id: 'give', label: 'Give', icon: 'card-outline', screen: 'Giving', color: '#27AE60' },
  { id: 'today', label: 'Today', icon: 'calendar-outline', tab: 'TodayTab', color: '#E67E22' },
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuthStore();
  const { theme, colors } = useThemeStore();
  const { greeting, nextService, events, isLoading, streak, refetch } = useHome(user);

  const handleShare = () => Share.share({ message: `${DAILY_VERSE.text}\n— ${DAILY_VERSE.reference}` });

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
        <View style={styles.hero}>
          <LinearGradient colors={[BaseColors.brown900, BaseColors.brown900]} style={StyleSheet.absoluteFill} />
          <View style={styles.verseCard}>
            <Text style={styles.verseEye}>✦ Verse of the day</Text>
            <Text style={styles.verseText}>{DAILY_VERSE.text}</Text>
            <Text style={{ color: theme.accentBorder }}>{DAILY_VERSE.reference}</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={14} color="#fff" />
              <Text style={{ color: '#fff' }}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>
          <View style={[styles.streak, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 24 }}>{streak.count > 0 ? '🔥' : '🌱'}</Text>
            <View>
              <Text style={{ fontWeight: 'bold', color: colors.text }}>{streak.count}-day streak</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{streak.status}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Quick access</Text>
          <View style={styles.grid}>
            {QUICK_ACCESS.map(item => (
              <TouchableOpacity key={item.id} style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => item.tab ? navigation.navigate(item.tab as any) : navigation.navigate(item.screen as any)}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
                <Text style={{ color: item.color, fontSize: 11, fontWeight: '600' }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Next Service</Text>
          <View style={[styles.service, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View>
              <Text style={{ color: theme.accent, fontWeight: 'bold' }}>{nextService?.day}</Text>
              <Text style={{ color: colors.text }}>{nextService?.service}</Text>
            </View>
            <Text style={{ color: colors.text }}>{nextService?.time}</Text>
          </View>
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
  grid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  gridItem: { flex: 1, padding: 12, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', gap: 8 },
  service: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: Radius.lg, borderWidth: 1 },
});
