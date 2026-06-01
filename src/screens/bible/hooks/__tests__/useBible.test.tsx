import { renderHook, waitFor } from '@testing-library/react-native';
import { useBible } from '../useBible';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

let queryClient: QueryClient;
let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        refetchOnWindowFocus: false,
      },
    },
  });

  wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
});

afterEach(async () => {
  await queryClient.cancelQueries();
  queryClient.clear();
  jest.clearAllMocks();
});

jest.mock('../../../../services/bibleApi', () => ({
  __esModule: true,
  fetchChapter: jest.fn(() => Promise.resolve({
    book: 'John',
    chapter: 3,
    verses: [{ num: 16, text: 'For God so loved...' }],
    translation: 'kjv'
  })),
  fetchFullBook: jest.fn(),
  getChapterCount: jest.fn(() => 21),
}));

jest.mock('../../../../services/offlineBible', () => ({
  getCachedChapter: jest.fn(() => Promise.resolve(null)),
  cacheChapter: jest.fn(),
  getNetworkState: jest.fn(() => Promise.resolve({ isConnected: true })),
  getDownloadedTranslations: jest.fn(() => Promise.resolve(['kjv'])),
}));

describe('useBible', () => {
  it('loads chapter data successfully', async () => {
    const { result } = renderHook(() => useBible('John', 3, 'kjv'), { wrapper });

    await waitFor(() => expect(result.current.isChapterLoading).toBe(false));
    expect(result.current.chapterData?.book).toBe('John');
    expect(result.current.chapterData?.verses[0].num).toBe(16);
  });
});
