import React from 'react';
import {
  Modal, TouchableOpacity, View, Text, StyleSheet,
  FlatList, TextInput, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseColors, Typography, Spacing, Radius } from '../../../constants/theme';
import { BIBLE_BOOKS } from '../../../services/bibleApi';
import { AVAILABLE_VERSIONS, type BibleTranslation } from '../../../types/bible';

interface BookPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (book: string) => void;
  currentBook: string;
  colors: any;
  theme: any;
}

export const BookPicker = ({ visible, onClose, onSelect, currentBook, colors, theme }: BookPickerProps) => (
  <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
    <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>Choose a book</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={[...BIBLE_BOOKS]}
        keyExtractor={(b) => b}
        numColumns={2}
        contentContainerStyle={styles.bookGrid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.bookItem,
              { backgroundColor: colors.card, borderColor: colors.border },
              item === currentBook && { backgroundColor: theme.accentLight, borderColor: theme.accent },
            ]}
            onPress={() => onSelect(item)}
          >
            <Text style={[
              styles.bookItemText,
              { color: colors.textSecondary },
              item === currentBook && { color: theme.accent, fontFamily: Typography.sansSemiBold },
            ]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  </Modal>
);

interface VersionPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: BibleTranslation) => void;
  currentTranslation: string;
  downloadedVersions: string[];
  onDelete: (id: BibleTranslation) => void;
  colors: any;
  theme: any;
}

export const VersionPicker = ({ visible, onClose, onSelect, currentTranslation, downloadedVersions, onDelete, colors, theme }: VersionPickerProps) => (
  <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
    <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>Bible Versions</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={AVAILABLE_VERSIONS}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.versionList}
        renderItem={({ item }) => {
          const isDownloaded = downloadedVersions.includes(item.id);
          return (
            <TouchableOpacity
              style={[
                styles.versionItem,
                { backgroundColor: colors.card, borderColor: colors.border },
                item.id === currentTranslation && { backgroundColor: theme.accentLight, borderColor: theme.accent },
              ]}
              onPress={() => onSelect(item.id as BibleTranslation)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.versionItemName, { color: colors.text }, item.id === currentTranslation && { color: theme.accent }]}>
                  {item.name} ({item.id.toUpperCase()})
                </Text>
                <Text style={[styles.versionItemLang, { color: colors.textMuted }]}>{item.language}</Text>
              </View>
              {isDownloaded ? (
                <TouchableOpacity onPress={() => onDelete(item.id as BibleTranslation)}>
                  <Ionicons name="cloud-done" size={20} color={BaseColors.sage} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  </Modal>
);

const styles = StyleSheet.create({
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
  },
  modalTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl },
  bookGrid: { padding: Spacing.xl, gap: Spacing.sm },
  bookItem: {
    flex: 1, margin: 4, paddingVertical: 12, paddingHorizontal: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1.5,
    alignItems: 'center',
  },
  bookItemText: { fontFamily: Typography.sansMedium, fontSize: Typography.sizes.sm },
  versionList: { padding: Spacing.xl },
  versionItem: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5, marginBottom: Spacing.sm,
  },
  versionItemName: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base },
  versionItemLang: { fontFamily: Typography.sans, fontSize: 11 },
});
