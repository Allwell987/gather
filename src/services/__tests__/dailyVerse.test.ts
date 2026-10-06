import { fetchDailyVerse } from '../dailyVerse';
import { supabase } from '../supabase';
import { fetchChapter } from '../bibleApi';
import { DAILY_VERSE as FALLBACK_VERSE } from '../../constants/theme';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
  },
}));

jest.mock('../bibleApi', () => ({
  ...jest.requireActual('../bibleApi'),
  fetchChapter: jest.fn(),
}));

describe('fetchDailyVerse', () => {
  const fromMock = supabase.from as jest.Mock;
  const fetchChapterMock = fetchChapter as jest.Mock;

  const getMaybeSingleMock = () => (supabase as any).maybeSingle as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects a verse from a random Bible chapter and keeps it stable for the day', async () => {
    fetchChapterMock.mockResolvedValue({
      book: 'John',
      chapter: 3,
      verses: [
        { num: 16, text: 'For God so loved the world.' },
        { num: 17, text: 'For God sent not his Son.' },
      ],
    });

    const firstResult = await fetchDailyVerse();
    const secondResult = await fetchDailyVerse();

    expect(firstResult).toEqual(secondResult);
    expect(firstResult).toEqual(expect.objectContaining({
      reference: expect.stringMatching(/^John 3:(16|17)$/),
      text: expect.any(String),
      backgroundImage: expect.any(String),
    }));
    expect(fetchChapterMock).toHaveBeenCalledWith(expect.any(String), expect.any(Number));
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('falls back to daily_verses if the Bible API returns no chapter', async () => {
    fetchChapterMock.mockResolvedValue(null);
    getMaybeSingleMock().mockResolvedValue({
      data: { text: 'I can do all things through Christ.', reference: 'Philippians 4:13' },
      error: null,
    });

    const result = await fetchDailyVerse();

    expect(result).toEqual({
      text: 'I can do all things through Christ.',
      reference: 'Philippians 4:13',
      backgroundImage: expect.any(String),
    });
  });

  it('falls back to hardcoded verse if everything fails', async () => {
    fetchChapterMock.mockResolvedValue(null);
    getMaybeSingleMock().mockResolvedValue({
      data: null,
      error: { message: 'DB Error' },
    });

    const result = await fetchDailyVerse();

    expect(result).toEqual({
      ...FALLBACK_VERSE,
      backgroundImage: expect.any(String),
    });
  });
});
