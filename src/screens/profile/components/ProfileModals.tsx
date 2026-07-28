import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TextInput from '../../../components/common/TextInput';
import Button from '../../../components/common/Button';
import { SettingRow } from './ProfileComponents';
import { Spacing, Radius, BaseColors } from '../../../constants/theme';

export const ProfileEditor = ({ visible, onClose, onSave, isSaving, initialData, theme, colors }: any) => {
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [birthday, setBirthday] = useState(initialData?.birthday || '');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Personal details</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <TextInput label="Full name" value={fullName} onChangeText={setFullName} accentColor={theme.accent} />
          <TextInput label="Birthday" value={birthday} onChangeText={setBirthday} placeholder="YYYY-MM-DD" accentColor={theme.accent} />
          <TextInput label="Address" value={address} onChangeText={setAddress} accentColor={theme.accent} />
          <Button label="Save details" onPress={() => onSave({ fullName, address, birthday })} loading={isSaving} accentColor={theme.accent} style={{ marginTop: 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

export const PreferencesEditor = ({ visible, onClose, onSave, isSaving, initialData, notificationsEnabled, theme, colors }: any) => {
  const [bibleVersion, setBibleVersion] = useState(initialData?.bible_version || 'niv');
  const [reminderTime, setReminderTime] = useState(initialData?.reminder_time || '06:00');
  const [enabled, setEnabled] = useState(notificationsEnabled);

  const BIBLE_VERSIONS = [
    { label: 'NIV', value: 'niv' },
    { label: 'KJV', value: 'kjv' },
    { label: 'NKJV', value: 'nkjv' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>App Settings</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>BIBLE PREFERENCE</Text>
          <View style={[styles.optionGroup, { borderColor: colors.border }]}>
            {BIBLE_VERSIONS.map((v, i) => (
              <TouchableOpacity
                key={v.value}
                style={[styles.optionRow, { borderBottomWidth: i === BIBLE_VERSIONS.length - 1 ? 0 : 1, borderBottomColor: colors.border }]}
                onPress={() => setBibleVersion(v.value)}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>{v.label}</Text>
                {bibleVersion === v.value && <Ionicons name="checkmark" size={20} color={theme.accent} />}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 32 }]}>DAILY REMINDER</Text>
          <View style={[styles.optionGroup, { borderColor: colors.border }]}>
            <SettingRow
              icon="notifications-outline"
              label="Enable Daily Verse"
              toggle
              toggleValue={enabled}
              onToggle={setEnabled}
              colors={colors}
              iconColor={theme.accent}
            />
            {enabled && (
              <View style={{ paddingHorizontal: Spacing.xl, paddingVertical: 12 }}>
                <TextInput
                  label="Reminder Time"
                  value={reminderTime}
                  onChangeText={setReminderTime}
                  placeholder="HH:MM (24h format)"
                  accentColor={theme.accent}
                />
              </View>
            )}
          </View>

          <Button
            label="Save Preferences"
            onPress={() => onSave(bibleVersion, reminderTime, enabled)}
            loading={isSaving}
            accentColor={theme.accent}
            style={{ marginTop: 40 }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold' },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
  optionGroup: { borderWidth: 1, borderRadius: Radius.xl, overflow: 'hidden' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
});
