import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../../../constants/theme';
import GlassView from '../../../components/common/GlassView';
import type { OnboardingSlideData } from '../constants/onboardingSlides';
import { t, getDeviceLocale } from '../../../services/locale';
import { CHURCH } from '../../../constants/theme';

const { width } = Dimensions.get('window');

interface OnboardingSlideProps {
  item: OnboardingSlideData;
  royal: any;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ item, royal }) => {
  const locale = getDeviceLocale();

  const localized = {
    eyebrow: t(`onboarding${item.id}Eyebrow` as any, locale),
    verse: t(`onboarding${item.id}Verse` as any, locale),
    ref: t(`onboarding${item.id}Ref` as any, locale),
    title: t(`onboarding${item.id}Title` as any, locale),
    sub: t(`onboarding${item.id}Sub` as any, locale).replace('{churchName}', CHURCH.name),
  };

  return (
    <View style={styles.slide}>
      <View style={styles.contentCard}>
        <View style={styles.iconCircle}>
          <Ionicons name={item.icon as any} size={40} color={royal.gold} />
        </View>
        <GlassView
          style={styles.verseBox}
          borderRadius={Radius.lg}
          intensity={40}
        >
          <View style={{ padding: Spacing.xl }}>
            <View style={styles.verseHeader}>
              <Ionicons name="eye-outline" size={14} color={royal.goldSoft} />
              <Text style={styles.verseEye}>{localized.eyebrow}</Text>
            </View>
            <Text style={styles.verseText} numberOfLines={3} adjustsFontSizeToFit>
              {localized.verse}
            </Text>
            <Text style={styles.verseRef}>{localized.ref}</Text>
          </View>
        </GlassView>
        <Text style={styles.slideTitle}>{localized.title}</Text>
        <Text style={styles.slideSub}>{localized.sub}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  contentCard: {
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(245,220,164,0.1)',
  },
  verseBox: {
    marginBottom: Spacing.xl,
    width: '100%',
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: Spacing.sm,
  },
  verseEye: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#f5dca4',
  },
  verseText: {
    fontFamily: Typography.serifItalic,
    fontSize: Typography.sizes.lg,
    color: '#fff8ed',
    lineHeight: 26,
    marginBottom: Spacing.sm,
  },
  verseRef: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.sm,
    color: '#f5dca4',
  },
  slideTitle: {
    fontFamily: Typography.serif,
    fontSize: Typography.sizes['4xl'],
    color: '#fff8ed',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  slideSub: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.base,
    color: 'rgba(255,248,237,0.72)',
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 310,
  },
});
