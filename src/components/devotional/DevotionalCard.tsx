import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Devotional } from '../../types/database';
import { BaseColors, Spacing, Radius, Typography } from '../../constants/theme';
import { t, getDeviceLocale } from '../../services/locale';

type Props = {
  devotional: Devotional;
  onShare?: () => void;
  onMarkRead?: () => void;
  hasReadToday?: boolean;
  isMarking?: boolean;
  colors?: { background?: string; card?: string; text?: string; border?: string; textSecondary?: string };
  accent?: string;
};

export default function DevotionalCard({ devotional, onShare, onMarkRead, hasReadToday, isMarking, colors = { text: '#1a365d', textSecondary: '#475569' }, accent = '#2b6cb0' }: Props) {
  const locale = getDeviceLocale();

  return (
    <View style={[styles.card, { backgroundColor: colors.card || '#fff', borderColor: colors.border || '#eee' }]}>
      <Text style={[styles.devoTitle, { color: accent }]}>{devotional.title}</Text>
      <Text style={styles.devoRef}>{devotional.anchor_scripture}</Text>

      {devotional.opening_charge ? (
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary || BaseColors.grayDark }]}>{t('openingCharge', locale)}</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>{devotional.opening_charge}</Text>
        </View>
      ) : null}

      {devotional.core_teaching ? (
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary || BaseColors.grayDark }]}>{t('coreTeaching', locale)}</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>{devotional.core_teaching}</Text>
        </View>
      ) : null}

      {devotional.supporting_scriptures && devotional.supporting_scriptures.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary || BaseColors.grayDark }]}>{t('supportingScriptures', locale)}</Text>
          {devotional.supporting_scriptures.map((s, i) => (
            <Text key={i} style={[styles.scriptureItem, { color: colors.text }]}>{`• ${s}`}</Text>
          ))}
        </View>
      ) : null}

      {devotional.spiritual_insight ? (
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary || BaseColors.grayDark }]}>{t('spiritualInsight', locale)}</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>{devotional.spiritual_insight}</Text>
        </View>
      ) : null}

      {devotional.biblical_example ? (
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary || BaseColors.grayDark }]}>{t('biblicalExample', locale)}</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>{devotional.biblical_example}</Text>
        </View>
      ) : null}

      {devotional.warning_correction ? (
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary || BaseColors.grayDark }]}>{t('warningCorrection', locale)}</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>{devotional.warning_correction}</Text>
        </View>
      ) : null}

      {devotional.declaration ? (
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary || BaseColors.grayDark }]}>{t('declaration', locale)}</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>{devotional.declaration}</Text>
        </View>
      ) : null}

      {devotional.summary ? (
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary || BaseColors.grayDark }]}>{t('summary', locale)}</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>{devotional.summary}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <TouchableOpacity onPress={onShare} style={styles.iconBtn}>
          <Ionicons name="share-social-outline" size={20} color={accent} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.readBtn, { backgroundColor: hasReadToday ? accent + '20' : accent }]}
          onPress={onMarkRead}
          disabled={hasReadToday || isMarking}
        >
          <Text style={{ color: hasReadToday ? accent : '#fff', fontWeight: '700' }}>
            {isMarking ? '...' : hasReadToday ? t('readDone', locale) : t('markAsRead', locale)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1 },
  devoTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  devoRef: { color: BaseColors.gray, textTransform: 'uppercase', fontSize: 10, letterSpacing: 1, marginBottom: 12 },
  section: { marginTop: 12 },
  sectionHeading: { fontSize: 13, fontWeight: '700', marginBottom: 6, color: BaseColors.grayDark },
  sectionText: { fontSize: 15, lineHeight: 22 },
  scriptureItem: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  readBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full },
  iconBtn: { padding: 6 },
});
