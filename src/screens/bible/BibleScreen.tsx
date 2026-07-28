// src/screens/bible/BibleScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Share, TextInput
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderBar from '../../components/common/HeaderBar';
import Button from '../../components/common/Button';
import { useThemeStore } from '../../store/themeStore';
import { BaseColors, Typography, Spacing, Radius } from '../../constants/theme';
import { useBible } from './hooks/useBible';
import { BIBLE_BOOKS, BibleBook, getChapterCount } from '../../services/bibleApi';
import { BookPicker, VersionPicker } from './components/BibleModals';
import { t, getDeviceLocale } from '../../services/locale';
import type { BibleTranslation } from '../../types/bible';
import type { HighlightColor } from '../../types/database';

const HIGHLIGHT_COLORS: { key: HighlightColor; hex: string; label: string }[] = [
  { key: 'yellow', hex: '#f9d98a', label: 'Yellow' },
  { key: 'blue', hex: '#93c5fd', label: 'Blue' },
  { key: 'green', hex: '#86efac', label: 'Green' },
];

export default function BibleScreen() {
  const { theme, colors } = useThemeStore();
  const locale = getDeviceLocale();
  const [currentBook, setCurrentBook] = useState<BibleBook>('John');
  const [currentChapter, setCurrentChapter] = useState(3);
  const [chapterInput, setChapterInput] = useState('3');
  const [currentTranslation, setCurrentTranslation] = useState<BibleTranslation>('kjv');

  const totalChapters = useMemo(() => getChapterCount(currentBook), [currentBook]);
  const bookIndex = useMemo(() => BIBLE_BOOKS.indexOf(currentBook), [currentBook]);
  const canGoPreviousBook = bookIndex > 0;
  const canGoNextBook = bookIndex < BIBLE_BOOKS.length - 1;
  const canGoPrevious = currentChapter > 1 || canGoPreviousBook;
  const canGoNext = currentChapter < totalChapters || canGoNextBook;

  const previousLabel = useMemo(() => {
    if (currentChapter > 1) return t('previousChapter', locale);
    if (canGoPreviousBook) return `${t('previousBook', locale)}: ${BIBLE_BOOKS[bookIndex - 1]}`;
    return t('previousChapter', locale);
  }, [currentChapter, canGoPreviousBook, bookIndex, locale]);

  const nextLabel = useMemo(() => {
    if (currentChapter < totalChapters) return t('nextChapter', locale);
    if (canGoNextBook) return `${t('nextBook', locale)}: ${BIBLE_BOOKS[bookIndex + 1]}`;
    return t('nextChapter', locale);
  }, [currentChapter, totalChapters, canGoNextBook, bookIndex, locale]);

  const {
    chapterData, isChapterLoading, downloadedVersions, isOffline,
    usingCached, isDownloading, downloadProgress, downloadBook,
    highlights, saveHighlight, deleteHighlight
  } = useBible(currentBook, currentChapter, currentTranslation);

  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  const updateChapterInput = (chapter: number) => {
    setChapterInput(String(chapter));
  };

  useEffect(() => {
    const loadLastRead = async () => {
      try {
        const raw = await AsyncStorage.getItem('@gather:last-read-bible');
        if (!raw) return;

        const parsed = JSON.parse(raw) as { book?: string; chapter?: number; translation?: BibleTranslation };
        if (!parsed?.book || !BIBLE_BOOKS.includes(parsed.book as BibleBook)) return;

        const book = parsed.book as BibleBook;
        const chapter = Number(parsed.chapter) || 1;
        const validatedChapter = Math.min(Math.max(chapter, 1), getChapterCount(book));
        const translation = parsed.translation ?? 'kjv';

        setCurrentBook(book);
        setCurrentChapter(validatedChapter);
        setCurrentTranslation(translation);
        updateChapterInput(validatedChapter);
      } catch (err) {
        if (__DEV__) {
          console.warn('Failed to load last-read bible state:', err);
        }
      }
    };

    void loadLastRead();
  }, []);

  const verses = chapterData?.verses ?? [];

  const jumpToChapter = () => {
    const parsed = Number(chapterInput);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= totalChapters) {
      setCurrentChapter(parsed);
      updateChapterInput(parsed);
      setSelectedVerse(null);
    }
  };

  const handleShare = async (verseNum: number, text: string) => {
    try {
      await Share.share({ message: `"${text}"\n— ${currentBook} ${currentChapter}:${verseNum} (${currentTranslation.toUpperCase()})` });
    } catch {}
  };

  const handlePreviousChapter = () => {
    if (currentChapter > 1) {
      setCurrentChapter((prev) => Math.max(prev - 1, 1));
      setSelectedVerse(null);
      return;
    }

    if (canGoPreviousBook) {
      const previousBook = BIBLE_BOOKS[bookIndex - 1] as BibleBook;
      setCurrentBook(previousBook);
      setCurrentChapter(getChapterCount(previousBook));
      setSelectedVerse(null);
    }
  };

  const handleNextChapter = () => {
    if (currentChapter < totalChapters) {
      setCurrentChapter((prev) => Math.min(prev + 1, totalChapters));
      setSelectedVerse(null);
      return;
    }

    if (canGoNextBook) {
      const nextBook = BIBLE_BOOKS[bookIndex + 1] as BibleBook;
      setCurrentBook(nextBook);
      setCurrentChapter(1);
      setSelectedVerse(null);
    }
  };

  const getHighlight = (v: number) => highlights.find(h => h.verse_start === v);

  const renderVerse = useCallback((verse: any, index: number) => {
    const hl = getHighlight(verse.num);
    const isSelected = selectedVerse === verse.num;

    return (
      <Animated.View key={verse.num} entering={FadeIn.delay(index * 20).duration(300)}>
        <TouchableOpacity
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
      </Animated.View>
    );
  }, [highlights, selectedVerse, theme, colors, getHighlight]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar
        title={currentBook}
        subtitle={`${t('chapter', locale)} ${currentChapter}`}
        onBackPress={() => setShowBookPicker(true)}
        rightAction={() => setShowVersionPicker(true)}
        rightIcon="options-outline"
        enableBlur
      />

      {(isOffline || usingCached || isDownloading) && (
        <View style={[styles.offlineBar, { backgroundColor: isDownloading ? theme.accent : 'rgba(0,0,0,0.4)' }]}>
          <Text style={styles.offlineText}>
            {isDownloading ? `${t('downloading', locale)}... ${downloadProgress}%` : isOffline ? t('offline', locale) : t('cached', locale)}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.chapterHeading}>
          <Text style={[styles.chapterBook, { color: theme.accent }]}>{currentBook} · {currentTranslation.toUpperCase()}</Text>
          <Text style={[styles.chapterNum, { color: colors.text }]}>{currentChapter}</Text>
          {!usingCached && !isOffline && (
            <TouchableOpacity style={[styles.downloadBtn, { borderColor: theme.accent }]} onPress={downloadBook}>
              <Text style={{ color: theme.accent }}>{t('downloadForOffline', locale)}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.chapterJumpRow}>
          <View style={[styles.chapterJumpInputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
            <Text style={[styles.jumpLabel, { color: colors.text }]}>{t('jumpTo', locale)}</Text>
            <TextInput
              style={[styles.chapterInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              keyboardType="number-pad"
              returnKeyType="done"
              value={chapterInput}
              onChangeText={(value) => setChapterInput(value.replace(/[^0-9]/g, ''))}
              onSubmitEditing={jumpToChapter}
              placeholder={`${currentChapter}`}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.chapterTotal, { color: colors.textSecondary }]}>/ {totalChapters}</Text>
          </View>
          <Button
            label={t('go', locale)}
            onPress={jumpToChapter}
            disabled={!chapterInput || Number(chapterInput) < 1 || Number(chapterInput) > totalChapters}
            variant="secondary"
            size="small"
            style={styles.goButton}
          />
        </View>

        {isChapterLoading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
        ) : verses.map((v, i) => renderVerse(v, i))}

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

      <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}> 
        <Button
          label={previousLabel}
          onPress={handlePreviousChapter}
          disabled={!canGoPrevious || isChapterLoading}
          variant="outline"
          style={styles.chapterNavButton}
        />
        <Button
          label={nextLabel}
          onPress={handleNextChapter}
          disabled={!canGoNext || isChapterLoading}
          variant="primary"
          style={styles.chapterNavButton}
        />
      </View>

      <BookPicker
        visible={showBookPicker}
        onClose={() => setShowBookPicker(false)}
        onSelect={(b) => {
          if (BIBLE_BOOKS.includes(b as BibleBook)) {
            setCurrentBook(b as BibleBook);
            setCurrentChapter(1);
          }
          setShowBookPicker(false);
        }}
        currentBook={currentBook}
        colors={colors}
        theme={theme}
      />
      <VersionPicker visible={showVersionPicker} onClose={() => setShowVersionPicker(false)} onSelect={v => { setCurrentTranslation(v); setShowVersionPicker(false); }} currentTranslation={currentTranslation} downloadedVersions={downloadedVersions} onDelete={() => {}} colors={colors} theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: 180 },
  chapterHeading: { alignItems: 'center', paddingVertical: Spacing.xl },
  chapterBook: { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  chapterNum: { fontSize: 64, fontFamily: Typography.serif, marginBottom: Spacing.md },
  chapterJumpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chapterJumpInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  jumpLabel: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  chapterInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: BaseColors.gray300,
    minWidth: 68,
  },
  chapterTotal: { fontSize: 14 },
  goButton: { minWidth: 66 },
  downloadBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1 },
  verseRow: { flexDirection: 'row', paddingVertical: 10, gap: 12 },
  verseNum: { fontSize: 11, fontWeight: 'bold', width: 24, paddingTop: 4 },
  verseText: { flex: 1, fontSize: 16, lineHeight: 26 },
  offlineBar: { paddingVertical: 4, alignItems: 'center' },
  offlineText: { color: '#fff', fontSize: 10, textTransform: 'uppercase' },
  actionPopup: { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: BaseColors.brown900, borderRadius: Radius.lg, padding: 16 },
  actionRow: { flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'center' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: BaseColors.gray200,
  },
  chapterNavButton: { flex: 1 },
  hlBtn: { width: 28, height: 28, borderRadius: 14 },
});
