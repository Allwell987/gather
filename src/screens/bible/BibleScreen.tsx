// src/screens/bible/BibleScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, FlatList, ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HeaderBar from '../../components/common/HeaderBar';
import { useThemeStore } from '../../store/themeStore';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { fetchChapter, fetchFullBook, BIBLE_BOOKS } from '../../services/bibleApi';
import { 
  getCachedChapter, 
  cacheChapter, 
  cacheMultipleChapters,
  getNetworkState,
  initializeOfflineBible,
  getDownloadedTranslations,
  deleteTranslation
} from '../../services/offlineBible';
import { AVAILABLE_VERSIONS, type BibleTranslation } from '../../types/bible';
import { BibleHighlight, BibleNote, HighlightColor as DBHighlightColor } from '../../types/database';

type UIHighlightColor = DBHighlightColor | null;

interface HighlightUI {
  verseNum: number;
  color: DBHighlightColor;
  note?: string;
}

const HIGHLIGHT_COLORS: { key: DBHighlightColor; hex: string; label: string }[] = [
  { key: 'yellow', hex: '#f9d98a', label: 'Yellow' },
  { key: 'blue', hex: '#93c5fd', label: 'Blue' },
  { key: 'green', hex: '#86efac', label: 'Green' },
];

export default function BibleScreen() {
  const { theme, colors } = useThemeStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [currentBook, setCurrentBook] = useState('John');
  const [currentChapter, setCurrentChapter] = useState(3);
  const [currentTranslation, setCurrentTranslation] = useState<BibleTranslation>('kjv');

  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [fontSize, setFontSize] = useState(15);
  const [isOffline, setIsOffline] = useState(false);
  const [usingCached, setUsingCached] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    initializeOfflineBible();
    checkNetwork();
  }, []);

  const checkNetwork = async () => {
    const { isConnected } = await getNetworkState();
    setIsOffline(!isConnected);
  };

  const fetchWithOfflineFallback = async (book: string, chapter: number, translation: BibleTranslation) => {
    const { isConnected } = await getNetworkState();
    setIsOffline(!isConnected);

    // Try cache first regardless of network
    const cached = await getCachedChapter(book, chapter, translation);
    if (cached) {
      setUsingCached(true);
      return cached;
    }

    if (isConnected) {
      const onlineData = await fetchChapter(book, chapter, translation);
      if (onlineData) {
        await cacheChapter(onlineData);
        setUsingCached(false);
        return onlineData;
      }
    }

    return null;
  };

  const { data: chapterData, isLoading: isChapterLoading } = useQuery({
    queryKey: ['bible-chapter', currentBook, currentChapter, currentTranslation],
    queryFn: () => fetchWithOfflineFallback(currentBook, currentChapter, currentTranslation),
  });

  const { data: downloadedVersions = [] } = useQuery({
    queryKey: ['downloaded-versions'],
    queryFn: getDownloadedTranslations,
  });

  const verses = chapterData?.verses ?? [];

  const handleDownloadBook = async (book: string, translation: BibleTranslation) => {
    const { isConnected } = await getNetworkState();
    if (!isConnected) {
      Alert.alert('No Internet', 'Please connect to the internet to download for offline use.');
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const chapters = await fetchFullBook(book, translation, (current, total) => {
        setDownloadProgress(Math.floor((current / total) * 100));
      });

      await cacheMultipleChapters(chapters);
      queryClient.invalidateQueries({ queryKey: ['downloaded-versions'] });

      Alert.alert('Download Complete', `${book} (${translation.toUpperCase()}) is now available offline.`);
    } catch {
      Alert.alert('Download Failed', 'Could not download the full book. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteVersion = async (translation: BibleTranslation) => {
    Alert.alert(
      'Remove Offline Access',
      `Are you sure you want to remove ${translation.toUpperCase()} from your local storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteTranslation(translation);
            queryClient.invalidateQueries({ queryKey: ['downloaded-versions'] });
          }
        }
      ]
    );
  };

  // Reset selected verse when changing chapter/book
  React.useEffect(() => {
    setSelectedVerse(null);
    setShowNoteModal(false);
    setNoteText('');
  }, [currentBook, currentChapter, currentTranslation]);

  // Fetch highlights for current chapter
  const { data: highlights = [] } = useQuery({
    queryKey: ['bible-highlights', user?.id, currentBook, currentChapter],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('bible_highlights')
        .select('*')
        .eq('user_id', user.id)
        .eq('book', currentBook)
        .eq('chapter', currentChapter)
        .returns<BibleHighlight[]>();
      if (error) throw error;
      return data.map((h): HighlightUI => ({
        verseNum: h.verse_start,
        color: h.color,
        note: h.text,
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch notes for current chapter
  const { data: notes = [] } = useQuery({
    queryKey: ['bible-notes', user?.id, currentBook, currentChapter],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('bible_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('book', currentBook)
        .eq('chapter', currentChapter)
        .returns<BibleNote[]>();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getHighlight = (verseNum: number) => {
    return highlights.find(h => h.verseNum === verseNum);
  };

  // Mutations
  const saveHighlightMutation = useMutation({
    mutationFn: async ({ verseNum, color }: { verseNum: number; color: DBHighlightColor }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const verse = verses.find(v => v.num === verseNum);
      if (!verse) throw new Error('Verse not found');

      const { error } = await supabase
        .from('bible_highlights')
        .upsert({
          user_id: user.id,
          book: currentBook,
          chapter: currentChapter,
          verse_start: verseNum,
          verse_end: verseNum,
          color,
          text: verse.text,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bible-highlights', user?.id, currentBook, currentChapter] });
    },
  });

  const deleteHighlightMutation = useMutation({
    mutationFn: async (verseNum: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('bible_highlights')
        .delete()
        .eq('user_id', user.id)
        .eq('book', currentBook)
        .eq('chapter', currentChapter)
        .eq('verse_start', verseNum);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bible-highlights', user?.id, currentBook, currentChapter] });
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async ({ verseNum, note }: { verseNum: number; note: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('bible_notes')
        .upsert({
          user_id: user.id,
          book: currentBook,
          chapter: currentChapter,
          verse_start: verseNum,
          verse_end: verseNum,
          note,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bible-notes', user?.id, currentBook, currentChapter] });
      setShowNoteModal(false);
      setNoteText('');
    },
  });

  const applyHighlight = (verseNum: number, color: UIHighlightColor) => {
    if (color === null) {
      deleteHighlightMutation.mutate(verseNum);
    } else {
      saveHighlightMutation.mutate({ verseNum, color });
    }
    setSelectedVerse(null);
  };

  const highlightBg = (color: DBHighlightColor | undefined) => {
    switch (color) {
      case 'yellow': return 'rgba(249,217,138,0.5)';
      case 'blue': return theme.accentLight;
      case 'green': return 'rgba(134,239,172,0.4)';
      default: return 'transparent';
    }
  };

  const highlightBorder = (color: DBHighlightColor | undefined) => {
    if (color === 'blue') return theme.accentBorder;
    return 'transparent';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title={currentBook}
        subtitle={`Chapter ${currentChapter}`}
        onBackPress={() => setShowBookPicker(true)}
        backgroundColor={BaseColors.brown900}
        textColor={BaseColors.white}
        subtitleColor={BaseColors.brown300}
        rightAction={() => setShowVersionPicker(true)}
        rightIcon="options-outline"
        accentColor={BaseColors.white}
        enableBlur={true}
      />

      {/* Offline indicator & Download Bar */}
      {isDownloading ? (
        <View style={[styles.offlineBar, { backgroundColor: theme.accent }]}>
          <ActivityIndicator size="small" color={BaseColors.white} />
          <Text style={styles.offlineText}>Downloading {currentBook}... {downloadProgress}%</Text>
        </View>
      ) : (isOffline || usingCached) ? (
        <View style={styles.offlineBar}>
          <Ionicons name={isOffline ? 'cloud-offline' : 'cloud-download'} size={14} color={BaseColors.white} />
          <Text style={styles.offlineText}>
            {isOffline ? 'Offline mode' : `${currentTranslation.toUpperCase()} (Downloaded)`}
          </Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={() => setSelectedVerse(null)}
        keyboardDismissMode="on-drag"
      >
        {/* Chapter heading */}
        <View style={styles.chapterHeading}>
          <Text style={[styles.chapterBook, { color: theme.accent }]}>{currentBook} · {currentTranslation.toUpperCase()}</Text>
          <Text style={[styles.chapterNum, { color: colors.text }]}>{currentChapter}</Text>

          {!usingCached && !isOffline && (
            <TouchableOpacity
              style={[styles.downloadBtn, { borderColor: theme.accent }]}
              onPress={() => handleDownloadBook(currentBook, currentTranslation)}
            >
              <Ionicons name="download-outline" size={14} color={theme.accent} />
              <Text style={[styles.downloadBtnText, { color: theme.accent }]}>Download {currentBook} for offline</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Loading state */}
        {isChapterLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading chapter...</Text>
          </View>
        ) : (
          verses.length === 0 && (
            <View style={styles.loadingContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.border} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chapter not available offline.</Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: theme.accent }]}
                onPress={() => queryClient.invalidateQueries({ queryKey: ['bible-chapter'] })}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* Verses */}
        {verses.map((verse) => {
          const hl = getHighlight(verse.num);
          const isSelected = selectedVerse === verse.num;
          return (
            <TouchableOpacity
              key={verse.num}
              onLongPress={() => setSelectedVerse(verse.num)}
              onPress={() => selectedVerse === verse.num ? setSelectedVerse(null) : setSelectedVerse(verse.num)}
              activeOpacity={0.75}
              style={[
                styles.verseRow,
                hl && {
                  backgroundColor: highlightBg(hl.color),
                  borderLeftWidth: hl.color === 'blue' ? 2 : 0,
                  borderLeftColor: highlightBorder(hl.color),
                },
                isSelected && [styles.verseSelected, { backgroundColor: colors.background, borderColor: BaseColors.gold }],
              ]}
            >
              <Text style={[styles.verseNum, { color: theme.accent }]}>{verse.num}</Text>
              <Text style={[styles.verseText, { fontSize, color: colors.text }]}>{verse.text}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Verse action popup */}
        {selectedVerse !== null && (
          <View style={styles.actionPopup}>
            <Text style={styles.actionPopupLabel}>Verse {selectedVerse}</Text>
            <View style={styles.actionRow}>
              {HIGHLIGHT_COLORS.map((hc) => (
                <TouchableOpacity
                  key={hc.key}
                  style={[styles.hlBtn, { backgroundColor: hc.hex }]}
                  onPress={() => applyHighlight(selectedVerse, hc.key)}
                >
                  {getHighlight(selectedVerse)?.color === hc.key && (
                    <Ionicons name="checkmark" size={12} color={BaseColors.brown900} />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => {
                  const existingNote = notes.find(n => n.verse_start === selectedVerse);
                  setNoteText(existingNote?.note || '');
                  setShowNoteModal(true);
                }}
              >
                <Ionicons name="pencil" size={16} color={BaseColors.white} />
                <Text style={styles.actionIconText}>Note</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => applyHighlight(selectedVerse, null)}
              >
                <Ionicons name="close" size={16} color={BaseColors.white} />
                <Text style={styles.actionIconText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIconBtn}>
                <Ionicons name="share-social" size={16} color={BaseColors.white} />
                <Text style={styles.actionIconText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Chapter navigation */}
      <View style={[styles.chapterNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.chNavBtn, { borderColor: colors.border }]}
          onPress={() => setCurrentChapter((c) => Math.max(1, c - 1))}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          <Text style={[styles.chNavText, { color: colors.textSecondary }]}>Ch. {currentChapter - 1}</Text>
        </TouchableOpacity>
        <View style={styles.chNavCenter}>
          <Text style={[styles.chNavBook, { color: colors.textMuted }]}>{currentBook}</Text>
          <Text style={[styles.chNavChapter, { color: colors.text }]}>Chapter {currentChapter}</Text>
        </View>
        <TouchableOpacity
          style={[styles.chNavBtn, { borderColor: colors.border }]}
          onPress={() => setCurrentChapter((c) => c + 1)}
        >
          <Text style={[styles.chNavText, { color: colors.textSecondary }]}>Ch. {currentChapter + 1}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Version Picker Modal */}
      <Modal visible={showVersionPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Bible Versions</Text>
            <TouchableOpacity onPress={() => setShowVersionPicker(false)}>
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
                  onPress={() => {
                    setCurrentTranslation(item.id);
                    setShowVersionPicker(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.versionItemName, { color: colors.text }, item.id === currentTranslation && { color: theme.accent }]}>
                      {item.name} ({item.id.toUpperCase()})
                    </Text>
                    <Text style={[styles.versionItemLang, { color: colors.textMuted }]}>{item.language}</Text>
                  </View>

                  {isDownloaded ? (
                    <TouchableOpacity onPress={() => handleDeleteVersion(item.id)}>
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

      {/* Book picker modal */}
      <Modal visible={showBookPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose a book</Text>
            <TouchableOpacity onPress={() => setShowBookPicker(false)}>
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
                  item === currentBook && {
                    backgroundColor: theme.accentLight,
                    borderColor: theme.accent,
                  },
                ]}
                onPress={() => {
                  setCurrentBook(item);
                  setCurrentChapter(1);
                  setShowBookPicker(false);
                }}
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

      {/* Note modal */}
      <Modal visible={showNoteModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add note — Verse {selectedVerse}</Text>
            <TouchableOpacity onPress={() => setShowNoteModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.noteBody}>
            <Text style={[styles.noteRef, { color: colors.textMuted }]}>{currentBook} {currentChapter}:{selectedVerse}</Text>
            <TextInput
              style={[styles.noteInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Write your thoughts on this verse…"
              placeholderTextColor={colors.textMuted}
              selectionColor={theme.accent}
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={[styles.noteSaveBtn, { backgroundColor: theme.accent }]}
              onPress={() => {
                if (selectedVerse && noteText.trim()) {
                  saveNoteMutation.mutate({ verseNum: selectedVerse, note: noteText.trim() });
                }
              }}
            >
              <Text style={styles.noteSaveBtnText}>Save note</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderBottomWidth: 2,
  },
  bookPickerBtn: { flex: 1 },
  versionPickerBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.15)',
    marginRight: Spacing.md,
  },
  versionText: { fontFamily: Typography.sansSemiBold, fontSize: 11, color: BaseColors.white },
  bookName: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl, color: BaseColors.white },
  chapterLabel: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs, color: BaseColors.brown300 },
  navActions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  navIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  fontSizeBtn: { fontFamily: Typography.sansSemiBold, color: BaseColors.white },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },
  chapterHeading: { alignItems: 'center', paddingVertical: Spacing.xl },
  chapterBook: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs, letterSpacing: 2, textTransform: 'uppercase' },
  chapterNum: {
    fontFamily: Typography.serif, fontSize: 64,
    lineHeight: 72,
    marginBottom: Spacing.md,
  },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1,
  },
  downloadBtnText: { fontFamily: Typography.sansSemiBold, fontSize: 11 },
  verseRow: {
    flexDirection: 'row', paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm, borderRadius: Radius.sm, marginBottom: 2,
    gap: Spacing.sm,
  },
  verseSelected: {
    borderWidth: 1,
  },
  verseNum: {
    fontFamily: Typography.sansSemiBold, fontSize: 11,
    minWidth: 22, paddingTop: 3, flexShrink: 0,
  },
  verseText: {
    fontFamily: Typography.serifItalic, lineHeight: 26,
    flex: 1,
  },
  actionPopup: {
    backgroundColor: BaseColors.brown900, borderRadius: Radius.lg,
    padding: Spacing.lg, marginTop: Spacing.xl,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  actionPopupLabel: {
    fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.xs,
    color: BaseColors.brown300, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  hlBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  actionIconBtn: {
    alignItems: 'center', gap: 3, paddingHorizontal: Spacing.sm,
  },
  actionIconText: {
    fontFamily: Typography.sans, fontSize: Typography.sizes.xs, color: BaseColors.brown300,
  },
  chapterNav: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  chNavBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5,
    borderRadius: Radius.md, paddingVertical: 9, paddingHorizontal: 14,
  },
  chNavText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm },
  chNavCenter: { flex: 1, alignItems: 'center' },
  chNavBook: { fontFamily: Typography.sans, fontSize: Typography.sizes.xs },
  chNavChapter: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base },
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
  },
  modalTitle: { fontFamily: Typography.serif, fontSize: Typography.sizes.xl },
  versionList: { padding: Spacing.xl },
  versionItem: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5, marginBottom: Spacing.sm,
  },
  versionItemName: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.base },
  versionItemLang: { fontFamily: Typography.sans, fontSize: 11 },
  bookGrid: { padding: Spacing.xl, gap: Spacing.sm },
  bookItem: {
    flex: 1, margin: 4, paddingVertical: 12, paddingHorizontal: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1.5,
    alignItems: 'center',
  },
  bookItemText: { fontFamily: Typography.sansMedium, fontSize: Typography.sizes.sm },
  noteBody: { padding: Spacing.xl, flex: 1 },
  noteRef: {
    fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.sm,
    marginBottom: Spacing.md,
  },
  noteInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.lg, padding: Spacing.xl,
    fontFamily: Typography.sans, fontSize: Typography.sizes.md,
    textAlignVertical: 'top',
    marginBottom: Spacing.xl,
  },
  noteSaveBtn: {
    borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center',
  },
  noteSaveBtnText: { fontFamily: Typography.sansSemiBold, fontSize: Typography.sizes.md, color: BaseColors.white },
  loadingContainer: {
    padding: Spacing.xl * 2,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Typography.sans,
    fontSize: Typography.sizes.md,
    marginTop: Spacing.md,
  },
  retryBtn: {
    marginTop: Spacing.xl, paddingHorizontal: Spacing.xl, paddingVertical: 10,
    borderRadius: Radius.md,
  },
  retryBtnText: { fontFamily: Typography.sansSemiBold, color: BaseColors.white },
  offlineBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 6, gap: 10,
  },
  offlineText: {
    fontFamily: Typography.sans, fontSize: Typography.sizes.xs,
    color: BaseColors.white, textTransform: 'uppercase', letterSpacing: 0.5,
  },
});
