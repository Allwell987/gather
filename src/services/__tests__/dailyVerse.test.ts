import { fetchDailyVerse } from '../dailyVerse';

describe('fetchDailyVerse', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the scripture assigned to the current day of the year', async () => {
    jest.setSystemTime(new Date(2026, 0, 1, 12));
    const result = await fetchDailyVerse();

    expect(result).toEqual({
      text: 'In the beginning God created the heaven and the earth.',
      reference: 'Genesis 1:1',
      backgroundImage: expect.any(String),
    });
  });

  it('uses day 365 on the final day of a non-leap year', async () => {
    jest.setSystemTime(new Date(2026, 11, 31, 12));
    const result = await fetchDailyVerse();

    expect(result.reference).toBe('Psalm 67:1');
  });

  it('keeps March 1 aligned to day 60 in leap years', async () => {
    jest.setSystemTime(new Date(2024, 1, 29, 12));
    const leapDay = await fetchDailyVerse();

    jest.setSystemTime(new Date(2024, 2, 1, 12));
    const marchFirst = await fetchDailyVerse();

    expect(leapDay.reference).toBe('Psalm 103:2');
    expect(marchFirst.reference).toBe('Psalm 103:12');
  });
});
