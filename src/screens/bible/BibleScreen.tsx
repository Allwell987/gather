// src/screens/bible/BibleScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HeaderBar from '../../components/common/HeaderBar';
import { useThemeStore } from '../../store/themeStore';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import { useBible } from './hooks/useBible';
import { BookPicker, VersionPicker } from './components/BibleModals';
import type { BibleTranslation } from '../../types/bible';
import type { HighlightColor } from '../../types/database';

const HIGHLIGHT_COLORS: { key: HighlightColor; hex: string; label: string }[] = [
  { key: 'yellow', hex: '#f9d98a', label: 'Yellow' },
  { key: 'blue', hex: '#93c5fd', label: 'Blue' },
  { key: 'green', hex: '#86efac', label: 'Green' },
];

export default function BibleScreen() {
  const { theme, colors } = useThemeStore();
  const [currentBook, setCurrentBook] = useState('John');
  const [currentChapter, setCurrentChapter] = useState(3);
  const [currentTranslation, setCurrentTranslation] = useState<BibleTranslation>('kjv');

  const {
    chapterData, isChapterLoading, downloadedVersions, isOffline,
    usingCached, isDownloading, downloadProgress, downloadBook,
    highlights, saveHighlight, deleteHighlight
  } = useBible(currentBook, currentChapter, currentTranslation);

  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  const verses = chapterData?.verses ?? [];

  const handleShare = async (verseNum: number, text: string) => {
    try {
      await Share.share({ message: `"${text}"\n— ${currentBook} ${currentChapter}:${verseNum} (${currentTranslation.toUpperCase()})` });
    } catch {}
  };

  const getHighlight = (v: number) => highlights.find(h => h.verse_start === v);

  const renderVerse = useCallback((verse: any) => {
    const hl = getHighlight(verse.num);
    const isSelected = selectedVerse === verse.num;

    return (
      <TouchableOpacity
        key={verse.num}
        onLongPress={() => setSelectedVerse(verse.num)}
        onPress={() => setSelectedVerse(isSelected ? null : verse.num)}
        activeOpacity={0.75}
        style={[
          styles.verseRow,
          hl && { backgroundColor: hl.color === 'yellow' ? 'rgba(249,217,138,0.5)' : hl.color === 'blue' ? theme.accentLight : 'rgba(134,239,172,0.4)' },
          isSelected && { borderBottomWidth: 2, borderBottomColor: theme.accent },
        ]}
      >
        <Text style={[styles.verseNum, { color: theme.accent }]}>{verse.num}</Text>
        <Text style={[styles.verseText, { color: colors.text }]}>{verse.text}</Text>
      </TouchableOpacity>
    );
  }, [highlights, selectedVerse, theme, colors, getHighlight]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title={currentBook}
        subtitle={`Chapter ${currentChapter}`}
        onBackPress={() => setShowBookPicker(true)}
        rightAction={() => setShowVersionPicker(true)}
        rightIcon="options-outline"
        enableBlur
      />

      {(isOffline || usingCached || isDownloading) && (
        <View style={[styles.offlineBar, { backgroundColor: isDownloading ? theme.accent : 'rgba(0,0,0,0.4)' }]}>
          <Text style={styles.offlineText}>
            {isDownloading ? `Downloading... ${downloadProgress}%` : isOffline ? 'Offline' : 'Cached'}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.chapterHeading}>
          <Text style={[styles.chapterBook, { color: theme.accent }]}>{currentBook} · {currentTranslation.toUpperCase()}</Text>
          <Text style={[styles.chapterNum, { color: colors.text }]}>{currentChapter}</Text>
          {!usingCached && !isOffline && (
            <TouchableOpacity style={[styles.downloadBtn, { borderColor: theme.accent }]} onPress={downloadBook}>
              <Text style={{ color: theme.accent }}>Download for offline</Text>
            </TouchableOpacity>
          )}
        </View>

        {isChapterLoading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
        ) : verses.map(renderVerse)}

        {selectedVerse && (
          <View style={styles.actionPopup}>
            <View style={styles.actionRow}>
              {HIGHLIGHT_COLORS.map(c => (
                <TouchableOpacity key={c.key} style={[styles.hlBtn, { backgroundColor: c.hex }]} onPress={() => saveHighlight({ verseNum: selectedVerse, color: c.key, text: verses.find(v => v.num === selectedVerse)?.text || '' })} />
              ))}
              <TouchableOpacity onPress={() => deleteHighlight(selectedVerse)}><Ionicons name="trash-outline" size={20} color="#fff" /></TouchableOpacity>
              <TouchableOpacity onPress={() => handleShare(selectedVerse, verses.find(v => v.num === selectedVerse)?.text || '')}><Ionicons name="share-social-outline" size={20} color="#fff" /></TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <BookPicker visible={showBookPicker} onClose={() => setShowBookPicker(false)} onSelect={b => { setCurrentBook(b); setCurrentChapter(1); setShowBookPicker(false); }} currentBook={currentBook} colors={colors} theme={theme} />
      <VersionPicker visible={showVersionPicker} onClose={() => setShowVersionPicker(false)} onSelect={v => { setCurrentTranslation(v); setShowVersionPicker(false); }} currentTranslation={currentTranslation} downloadedVersions={downloadedVersions} onDelete={() => {}} colors={colors} theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },
  chapterHeading: { alignItems: 'center', paddingVertical: Spacing.xl },
  chapterBook: { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  chapterNum: { fontSize: 64, fontFamily: Typography.serif, marginBottom: Spacing.md },
  downloadBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1 },
  verseRow: { flexDirection: 'row', paddingVertical: 10, gap: 12 },
  verseNum: { fontSize: 11, fontWeight: 'bold', width: 24, paddingTop: 4 },
  verseText: { flex: 1, fontSize: 16, lineHeight: 26 },
  offlineBar: { paddingVertical: 4, alignItems: 'center' },
  offlineText: { color: '#fff', fontSize: 10, textTransform: 'uppercase' },
  actionPopup: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: BaseColors.brown900, borderRadius: Radius.lg, padding: 16 },
  actionRow: { flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'center' },
  hlBtn: { width: 28, height: 28, borderRadius: 14 },
});
