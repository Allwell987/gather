import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BaseColors, Typography, Spacing, Radius } from '../../../constants/theme';
import type { PrayerCategory } from '../../../types/database';

interface PrayerComposeModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  newPrayerText: string;
  setNewPrayerText: (text: string) => void;
  composeError: string | null;
  selectedCategory: PrayerCategory;
  setSelectedCategory: (cat: PrayerCategory) => void;
  isAnonymous: boolean;
  setIsAnonymous: (anon: boolean) => void;
  submitting: boolean;
  theme: any;
  colors: any;
}

const CATEGORIES: PrayerCategory[] = ['Health', 'Family', 'Provision', 'Studies', 'Missions', 'Testimony'];

export const PrayerComposeModal: React.FC<PrayerComposeModalProps> = ({
  visible,
  onClose,
  onSubmit,
  newPrayerText,
  setNewPrayerText,
  composeError,
  selectedCategory,
  setSelectedCategory,
  isAnonymous,
  setIsAnonymous,
  submitting,
  theme,
  colors,
}) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Share a prayer request</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close prayer request composer"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.composeBody}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
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
                  composeError ? styles.inputError : null,
                ]}
                value={newPrayerText}
                onChangeText={(t) => {
                  setNewPrayerText(t);
                }}
                placeholder="Share what you need prayer for…"
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                selectionColor={theme.accent}
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
                <Text style={[styles.anonSub, { color: colors.textSecondary }]}>
                  Your name won&apos;t be shown to others
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.accent }]}
              onPress={onSubmit}
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
  );
};

const styles = StyleSheet.create({
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    borderBottomWidth: 1,
  },
  modalTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl },
  composeBody: { padding: Spacing.xl, gap: Spacing.xl },
  composeLabel: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  catChipText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  inputSection: { gap: Spacing.sm },
  composeInput: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    minHeight: 140,
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.md,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: BaseColors.red500 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText: { fontFamily: Typography.sans, fontSize: 12, color: BaseColors.red500 },
  anonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  anonToggle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonLabel: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base },
  anonSub: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs },
  submitBtn: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  submitBtnText: {
    fontFamily: Typography.sansSemiBold,
    fontSize: Typography.sizes.md,
    color: BaseColors.white,
  },
});
