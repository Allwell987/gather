// src/screens/auth/ThemePickerScreen.tsx
import React, { useState, useMemo } from 'react';
import {
  Alert,
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import HeaderBar from '../../components/common/HeaderBar';
import { useAuthStore } from '../../store/authStore';
import { ensureProfileForSession } from '../../services/profile';
import { supabase } from '../../services/supabase';
import { useThemeStore } from '../../store/themeStore';
import {
  ACCENT_THEMES, AccentKey, BaseColors,
  Spacing, Radius, FONT_STYLES, FontStyle, Typography,
} from '../../constants/theme';
import type { AuthStackNavigationProp, ThemePickerRouteProp } from '../../types/navigation';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing['2xl'] * 2 - Spacing.lg) / 2;

type Tab = 'theme' | 'font';

export default function ThemePickerScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const route = useRoute<ThemePickerRouteProp>();
  const fromOnboarding = route.params?.fromOnboarding ?? false;
  const isOnboardingFlow = fromOnboarding || !navigation.canGoBack();
  const { user, setUser, setSession, setIsOnboarded } = useAuthStore();
  const { theme: currentTheme, setAccent, fontStyle, fontConfig, setFontStyle } = useThemeStore();
  const [activeTab, setActiveTab] = useState<Tab>('theme');

  const dynamicStyles = useMemo(() => StyleSheet.create({
    stepLabel: {
      fontFamily: fontConfig.sansSemiBold,
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: 'uppercase' as const,
      color: BaseColors.gold,
      marginBottom: 4,
    },
    title: {
      fontFamily: fontConfig.serif,
      fontSize: 28,
      color: BaseColors.white,
      marginBottom: Spacing.sm,
    },
    subtitle: {
      fontFamily: fontConfig.sans,
      fontSize: 14,
      color: BaseColors.brown300,
      lineHeight: 20,
    },
    cardName: {
      fontFamily: fontConfig.sansSemiBold,
      fontSize: 12,
      color: BaseColors.white,
      flex: 1,
    },
    defaultBadgeText: {
      fontFamily: fontConfig.sansSemiBold,
      fontSize: 9,
      color: BaseColors.white,
    },
    previewText: {
      fontFamily: fontConfig.sansMedium,
      fontSize: 12,
      flex: 1,
    },
    previewPillText: {
      fontFamily: fontConfig.sansSemiBold,
      fontSize: 10,
      color: BaseColors.white,
    },
    continueBtnText: {
      fontFamily: fontConfig.sansSemiBold,
      fontSize: 16,
      color: BaseColors.white,
    },
    fontName: {
      fontFamily: fontConfig.serif,
      fontSize: 16,
      color: BaseColors.white,
    },
    fontPreview: {
      fontFamily: fontConfig.sans,
      fontSize: 13,
      color: BaseColors.brown300,
    },
  }), [fontConfig]);

  const handleSelect = (key: AccentKey) => {
    setAccent(key);
  };

  const handleFontSelect = (key: FontStyle) => {
    setFontStyle(key);
  };

  const handleContinue = async () => {
    if (isOnboardingFlow) {
      if (!user) {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          Alert.alert('Sign in required', 'Please sign in to continue to the app.');
          navigation.navigate('Login');
          return;
        }

        try {
          const profile = await ensureProfileForSession(session);
          setUser(profile);
          setSession(session.access_token ?? null);
        } catch (error) {
          console.error('ThemePicker session recovery error:', error);
          Alert.alert('Profile setup issue', 'Please sign in again to continue.');
          navigation.navigate('Login');
          return;
        }
      }

      setIsOnboarded(true);
      const parentNav = navigation.getParent();
      if (parentNav && parentNav.getState && parentNav.getState().routeNames?.includes('Main')) {
        parentNav.navigate('Main' as never);
      } else {
        // Fallback to HomeTab if already inside MainNavigator
        navigation.navigate('HomeTab' as never);
      }
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[BaseColors.brown900, BaseColors.brown800]}
        style={StyleSheet.absoluteFill}
      />
      <HeaderBar
        title={isOnboardingFlow ? "Setup Profile" : "Appearance"}
        showBack={!fromOnboarding}
        onBackPress={() => navigation.goBack()}
        backgroundColor="transparent"
        enableBlur={true}
        blurTint="dark"
      />
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        {/* Header content moved into scroll or adjusted */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={dynamicStyles.stepLabel}>
              {isOnboardingFlow ? 'Step 2 of 2' : 'Appearance'}
            </Text>
            <Text style={dynamicStyles.title}>
              {activeTab === 'theme' ? 'Choose your theme' : 'Choose your font'}
            </Text>
            <Text style={dynamicStyles.subtitle}>
              {activeTab === 'theme' 
                ? 'Pick an accent colour. You can change this anytime in settings.'
                : 'Select a font style. Preview how it looks below.'}
            </Text>
          </View>
        </View>

        {/* Tab selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'theme' && { borderBottomColor: currentTheme.accent }]}
            onPress={() => setActiveTab('theme')}
          >
            <Text style={[styles.tabText, activeTab === 'theme' && { color: currentTheme.accent }]}>
              Theme
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'font' && { borderBottomColor: currentTheme.accent }]}
            onPress={() => setActiveTab('font')}
          >
            <Text style={[styles.tabText, activeTab === 'font' && { color: currentTheme.accent }]}>
              Font
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on tab */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={activeTab === 'theme' ? styles.grid : styles.fontGrid}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {activeTab === 'theme' ? (
            // Colour grid
            ACCENT_THEMES.map((t) => {
              const isSelected = currentTheme.key === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.themeCard,
                    {
                      borderColor: isSelected ? t.accent : 'rgba(255,255,255,0.08)',
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleSelect(t.key)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.colourSwatch, { backgroundColor: t.accent }]}>
                    <View style={styles.miniPhone}>
                      <View style={[styles.miniHeader, { backgroundColor: BaseColors.brown900 }]}>
                        <View style={[styles.miniDot, { backgroundColor: t.accent }]} />
                      </View>
                      <View style={styles.miniBody}>
                        <View style={[styles.miniBar, { backgroundColor: t.accentLight, width: '80%' }]} />
                        <View style={[styles.miniBar, { backgroundColor: t.accentLight, width: '60%' }]} />
                        <View style={[styles.miniBtn, { backgroundColor: t.accent }]} />
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardLabel}>
                    <Text style={styles.cardEmoji}>{t.emoji}</Text>
                    <Text style={dynamicStyles.cardName}>{t.name}</Text>
                    {t.key === 'sapphire' && (
                      <View style={styles.defaultBadge}>
                        <Text style={dynamicStyles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  {isSelected && (
                    <View style={[styles.tick, { backgroundColor: t.accent }]}>
                      <Ionicons name="checkmark" size={14} color={BaseColors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            // Font grid
            FONT_STYLES.map((f) => {
              const isSelected = fontStyle === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.fontCard,
                    {
                      borderColor: isSelected ? currentTheme.accent : 'rgba(255,255,255,0.08)',
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleFontSelect(f.key)}
                  activeOpacity={0.85}
                >
                  <View style={styles.fontHeader}>
                    <Text style={styles.fontEmoji}>
                      {f.key === 'modern' ? '✨' : f.key === 'classic' ? '📜' : '💎'}
                    </Text>
                    <View style={styles.fontInfo}>
                      <Text style={dynamicStyles.fontName}>{f.name}</Text>
                      <Text style={dynamicStyles.fontPreview}>{f.preview}</Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.tick, { backgroundColor: currentTheme.accent }]}>
                        <Ionicons name="checkmark" size={14} color={BaseColors.white} />
                      </View>
                    )}
                  </View>
                  <View style={styles.fontSample}>
                    <Text style={{ fontFamily: f.serif, fontSize: 18, color: BaseColors.white }}>
                      The Lord is my shepherd
                    </Text>
                    <Text style={{ fontFamily: f.sans, fontSize: 13, color: BaseColors.brown300, marginTop: 4 }}>
                      And we have different gifts
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Live preview strip */}
        <View style={[styles.previewStrip, { backgroundColor: currentTheme.accentLight }]}>
          <View style={[styles.previewDot, { backgroundColor: currentTheme.accent }]} />
          <Text style={[dynamicStyles.previewText, { color: currentTheme.accentDeep }]}>
            {activeTab === 'theme' 
              ? `Preview — ${currentTheme.name}`
              : `Font — ${fontConfig.name}`}
          </Text>
          <View style={[styles.previewPill, { backgroundColor: currentTheme.accent }]}>
            <Text style={dynamicStyles.previewPillText}>Active</Text>
          </View>
        </View>

        {/* Continue button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: currentTheme.accent }]}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={dynamicStyles.continueBtnText}>
              {isOnboardingFlow ? 'Continue →' : 'Save changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  header: { paddingHorizontal: Spacing['2xl'], paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  backBtn: {
    width: 36, height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  headerText: {},
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing['2xl'],
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    paddingVertical: Spacing.sm,
    marginRight: Spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontFamily: Typography.sansMedium,
    fontSize: 14,
    color: BaseColors.brown300,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  fontGrid: {
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  themeCard: {
    width: CARD_WIDTH,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  fontCard: {
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: Spacing.lg,
  },
  colourSwatch: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPhone: {
    width: 60,
    height: 80,
    backgroundColor: BaseColors.cream,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  miniHeader: { height: 18, justifyContent: 'center', paddingHorizontal: 6 },
  miniDot: { width: 6, height: 6, borderRadius: 3 },
  miniBody: { flex: 1, padding: 6, gap: 4 },
  miniBar: { height: 5, borderRadius: 3 },
  miniBtn: { height: 14, borderRadius: 4, marginTop: 4 },
  cardLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  cardEmoji: { fontSize: 14 },
  fontHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  fontEmoji: { fontSize: 24 },
  fontInfo: { flex: 1 },
  fontSample: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  defaultBadge: {
    backgroundColor: BaseColors.gold,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tick: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing['2xl'],
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  previewDot: { width: 10, height: 10, borderRadius: 5 },
  previewPill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  footer: { paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.xl },
  continueBtn: {
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
});
