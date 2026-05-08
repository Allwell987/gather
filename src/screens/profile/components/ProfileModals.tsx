import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TextInput from '../../../components/common/TextInput';
import Button from '../../../components/common/Button';
import { Spacing, Radius, BaseColors } from '../../../constants/theme';

export const ProfileEditor = ({ visible, onClose, onSave, isSaving, initialData, theme, colors }: any) => {
  const [fullName, setFullName] = useState(initialData.full_name || '');
  const [address, setAddress] = useState(initialData.address || '');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Personal details</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <TextInput label="Full name" value={fullName} onChangeText={setFullName} accentColor={theme.accent} />
          <TextInput label="Address" value={address} onChangeText={setAddress} accentColor={theme.accent} />
          <Button label="Save details" onPress={() => onSave({ fullName, address })} loading={isSaving} accentColor={theme.accent} style={{ marginTop: 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

// ... More modals could be added here (Preferences, Verification, etc.)

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold' },
  content: { paddingHorizontal: Spacing.xl },
});
