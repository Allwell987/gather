import { fetchDailyVerse } from '../dailyVerse';
import { supabase } from '../supabase';
import { fetchVerseText } from '../bibleApi';
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
  fetchVerseText: jest.fn(),
}));

describe('fetchDailyVerse', () => {
  const fromMock = supabase.from as jest.Mock;
  const fetchVerseTextMock = fetchVerseText as jest.Mock;

  // Use a helper to get access to mocked methods if needed
  const getMaybeSingleMock = () => (supabase as any).maybeSingle as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prioritizes the anchor scripture from today\'s devotional', async () => {
    // 1. Mock today's devotional
    getMaybeSingleMock()
      .mockResolvedValueOnce({
        data: { anchor_scripture: 'Psalm 23:1' },
        error: null,
      })
      // 2. Mock existing verse check
      .mockResolvedValueOnce({
        data: { text: 'The Lord is my shepherd.' },
        error: null,
      });

    const result = await fetchDailyVerse();

    expect(result).toEqual({
      text: 'The Lord is my shepherd.',
      reference: 'Psalm 23:1',
      backgroundImage: expect.any(String),
    });
    expect(fromMock).toHaveBeenCalledWith('devotionals');
    expect(fromMock).toHaveBeenCalledWith('daily_verses');
  });

  it('fetches from Bible API if text is not in daily_verses', async () => {
    // 1. Mock today's devotional
    getMaybeSingleMock()
      .mockResolvedValueOnce({
        data: { anchor_scripture: 'John 3:16' },
        error: null,
      })
      // 2. Mock existing verse check (none found)
      .mockResolvedValueOnce({
        data: null,
        error: null,
      });

    // 3. Mock Bible API fetch
    fetchVerseTextMock.mockResolvedValue('For God so loved the world.');

    const result = await fetchDailyVerse();

    expect(result).toEqual({
      text: 'For God so loved the world.',
      reference: 'John 3:16',
      backgroundImage: expect.any(String),
    });
    expect(fetchVerseTextMock).toHaveBeenCalledWith('John 3:16');
  });

  it('falls back to daily_verses if no devotional is found', async () => {
    // 1. Mock no devotional found
    getMaybeSingleMock()
      .mockResolvedValueOnce({
        data: null,
        error: null,
      })
      // 2. Mock daily_verse found
      .mockResolvedValueOnce({
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
    // 1. Mock devotional fetch error
    getMaybeSingleMock()
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'DB Error' },
      })
      // 2. Mock daily_verse fetch error
      .mockResolvedValueOnce({
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
