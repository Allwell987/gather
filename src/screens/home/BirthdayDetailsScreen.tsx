import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import HeaderBar from '../../components/common/HeaderBar';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import type { HomeScreenNavigationProp } from '../../types/navigation';

const CELEBRATION_SUGGESTIONS = [
  'Invite close friends for cake and prayer',
  'Share a gratitude message in the community',
  'Plan a family worship night',
  'Give a thoughtful gift or scripture card',
];

export default function BirthdayDetailsScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { theme, colors } = useThemeStore();
  const { user } = useAuthStore();
  const [name, setName] = useState('Samuel');
  const [birthday, setBirthday] = useState('June 12, 2026');
  const [address, setAddress] = useState(user?.address ?? '');
  const [notes, setNotes] = useState('Celebrate God’s faithfulness and pray for fresh grace.');

  const handleSave = () => {
    Alert.alert('Saved', 'Birthday details have been updated.');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <HeaderBar
        title="Birthday Details"
        subtitle="Plans and celebration ideas"
        showBack
        onBackPress={() => navigation.goBack()}
        accentColor={theme.accent}
        backgroundColor={colors.card}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Celebrant</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter name"
            placeholderTextColor={theme.accentLight}
          />
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.lg }]}>Date</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={birthday}
            onChangeText={setBirthday}
            placeholder="Enter birthday date"
            placeholderTextColor={theme.accentLight}
          />
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.lg }]}>Location</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter address"
            placeholderTextColor={theme.accentLight}
          />
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.lg }]}>Notes</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Write your birthday celebration notes"
            placeholderTextColor={theme.accentLight}
            multiline
          />
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.accent }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save Birthday</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Celebration Ideas</Text>
          {CELEBRATION_SUGGESTIONS.map((item) => (
            <View key={item} style={[styles.ideaRow, { backgroundColor: theme.accentSubtle }]}> 
              <Ionicons name="sparkles" size={18} color={theme.accent} style={styles.ideaIcon} />
              <Text style={[styles.ideaText, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>What to Do</Text>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>Use this page to keep birthday details, add celebration notes, and pick a joyful way to honour the day.</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={[styles.actionChip, { backgroundColor: theme.accent }]}> 
              <Ionicons name="gift-outline" size={18} color={BaseColors.white} />
              <Text style={styles.actionChipText}>Send Gift</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Typography.sansSemiBold,
    fontSize: 18,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontFamily: Typography.sans,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 120,
    fontFamily: Typography.sans,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: Spacing.lg,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: BaseColors.white,
    fontFamily: Typography.sansSemiBold,
    fontSize: 16,
  },
  ideaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  ideaIcon: {
    marginRight: Spacing.sm,
  },
  ideaText: {
    fontFamily: Typography.sans,
    fontSize: 15,
    flex: 1,
  },
  bodyText: {
    marginTop: Spacing.sm,
    fontFamily: Typography.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.md,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionChipText: {
    color: BaseColors.white,
    fontFamily: Typography.sansSemiBold,
    fontSize: 14,
    marginLeft: Spacing.xs,
  },
});
