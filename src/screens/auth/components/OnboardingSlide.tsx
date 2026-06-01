import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../../../constants/theme';
import type { OnboardingSlideData } from '../constants/onboardingSlides';

const { width } = Dimensions.get('window');

interface OnboardingSlideProps {
  item: OnboardingSlideData;
  royal: any;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ item, royal }) => {
  return (
    <View style={styles.slide}>
      <View style={styles.contentCard}>
        <View style={styles.iconCircle}>
          <Ionicons name={item.icon as any} size={40} color={royal.gold} />
        </View>
        <View style={styles.verseBox}>
          <View style={styles.verseHeader}>
            <Ionicons name="eye-outline" size={14} color={royal.goldSoft} />
            <Text style={styles.verseEye}>{item.eyebrow}</Text>
          </View>
          <Text style={styles.verseText} numberOfLines={3} adjustsFontSizeToFit>
            {item.verse}
          </Text>
          <Text style={styles.verseRef}>{item.ref}</Text>
        </View>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideSub}>{item.sub}</Text>
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(245,220,164,0.24)',
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
