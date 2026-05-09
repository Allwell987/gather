import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { fetchChapter, fetchFullBook } from '../../../services/bibleApi';
import {
  getCachedChapter,
  cacheChapter,
  cacheMultipleChapters,
  getNetworkState,
  getDownloadedTranslations
} from '../../../services/offlineBible';
import { type BibleTranslation } from '../../../types/bible';
import { BibleHighlight, BibleNote, HighlightColor } from '../../../types/database';

export function useBible(book: string, chapter: number, translation: BibleTranslation) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isOffline, setIsOffline] = useState(false);
  const [usingCached, setUsingCached] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const fetchWithOfflineFallback = async (b: string, c: number, t: BibleTranslation) => {
    const { isConnected } = await getNetworkState();
    setIsOffline(!isConnected);

    const cached = await getCachedChapter(b, c, t);
    if (cached) {
      setUsingCached(true);
      return cached;
    }

    if (isConnected) {
      const onlineData = await fetchChapter(b, c, t);
      if (onlineData) {
        await cacheChapter(onlineData);
        setUsingCached(false);
        return onlineData;
      }
    }
    return null;
  };

  const { data: chapterData, isLoading: isChapterLoading } = useQuery({
    queryKey: ['bible-chapter', book, chapter, translation],
    queryFn: () => fetchWithOfflineFallback(book, chapter, translation),
  });

  const { data: downloadedVersions = [] } = useQuery({
    queryKey: ['downloaded-versions'],
    queryFn: getDownloadedTranslations,
  });

  const downloadBook = async () => {
    const { isConnected } = await getNetworkState();
    if (!isConnected) return;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      const chapters = await fetchFullBook(book, translation, (curr, total) => {
        setDownloadProgress(Math.floor((curr / total) * 100));
      });
      await cacheMultipleChapters(chapters);
      queryClient.invalidateQueries({ queryKey: ['downloaded-versions'] });
    } finally {
      setIsDownloading(false);
    }
  };

  // Highlights & Notes
  const { data: highlights = [] } = useQuery<BibleHighlight[]>({
    queryKey: ['bible-highlights', user?.id, book, chapter],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('bible_highlights').select('*').eq('user_id', user.id).eq('book', book).eq('chapter', chapter);
      if (error) throw error;
      return data as BibleHighlight[];
    },
    enabled: !!user?.id,
  });

  const saveHighlight = useMutation({
    mutationFn: async ({ verseNum, color, text }: { verseNum: number; color: HighlightColor; text: string }) => {
      if (!user?.id) return;
      await supabase.from('bible_highlights').upsert({
        user_id: user.id, book, chapter, verse_start: verseNum, verse_end: verseNum, color, text
      } as never);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bible-highlights'] }),
  });

  const deleteHighlight = useMutation({
    mutationFn: async (verseNum: number) => {
      if (!user?.id) return;
      await supabase.from('bible_highlights').delete().eq('user_id', user.id).eq('book', book).eq('chapter', chapter).eq('verse_start', verseNum);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bible-highlights'] }),
  });

  return {
    chapterData,
    isChapterLoading,
    downloadedVersions,
    isOffline,
    usingCached,
    isDownloading,
    downloadProgress,
    downloadBook,
    highlights,
    saveHighlight: saveHighlight.mutate,
    deleteHighlight: deleteHighlight.mutate,
  };
}
