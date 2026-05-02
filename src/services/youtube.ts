// src/services/youtube.ts
//
// YouTube Data API v3 integration.
// Quota notes:
//   - search.list costs 100 units per call.
//   - Free quota: 10,000 units/day.
//   - Live-status polling is set to 15-minute intervals to stay well within limits.
//   - React Query shares the cache across screens with the same queryKey, so the
//     actual number of API calls is much lower than one per screen.
//
// Setup:
//   1. Go to https://console.cloud.google.com → APIs → YouTube Data API v3 → Enable.
//   2. Create an API key, restrict it to "YouTube Data API v3" and your app package.
//   3. Add to your .env:
//        EXPO_PUBLIC_YOUTUBE_API_KEY=AIza...
//        EXPO_PUBLIC_YOUTUBE_CHANNEL_ID=UCxxxxxxxx     (channel ID, NOT the @handle)

const API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';
const CHANNEL_ID = process.env.EXPO_PUBLIC_YOUTUBE_CHANNEL_ID ?? '';
const BASE = 'https://www.googleapis.com/youtube/v3';

export interface YoutubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

/**
 * Returns the latest videos uploaded to the configured YouTube channel.
 * Falls back to [] when the API key or channel ID is not set.
 */
export async function fetchYoutubeVideos(maxResults = 8): Promise<YoutubeVideo[]> {
  if (!API_KEY || !CHANNEL_ID) return [];

  const url =
    `${BASE}/search?part=snippet` +
    `&channelId=${encodeURIComponent(CHANNEL_ID)}` +
    `&type=video&order=date` +
    `&maxResults=${maxResults}` +
    `&key=${encodeURIComponent(API_KEY)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

  const data = (await res.json()) as {
    items?: {
      id: { videoId: string };
      snippet: {
        title: string;
        publishedAt: string;
        thumbnails: { medium?: { url: string }; default?: { url: string } };
      };
    }[];
  };

  return (data.items ?? []).map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    thumbnail:
      item.snippet.thumbnails.medium?.url ??
      item.snippet.thumbnails.default?.url ??
      '',
    publishedAt: item.snippet.publishedAt,
  }));
}

/**
 * Returns the currently-live video for the configured channel, or null.
 * Uses the YouTube search `eventType=live` filter.
 */
export async function fetchYoutubeLive(): Promise<YoutubeVideo | null> {
  if (!API_KEY || !CHANNEL_ID) return null;

  const url =
    `${BASE}/search?part=snippet` +
    `&channelId=${encodeURIComponent(CHANNEL_ID)}` +
    `&type=video&eventType=live` +
    `&key=${encodeURIComponent(API_KEY)}`;

  const res = await fetch(url);
  if (!res.ok) return null; // swallow to avoid crashing the screen

  const data = (await res.json()) as {
    items?: {
      id: { videoId: string };
      snippet: {
        title: string;
        publishedAt: string;
        thumbnails: { medium?: { url: string }; default?: { url: string } };
      };
    }[];
  };

  if (!data.items?.length) return null;

  const item = data.items[0];
  return {
    id: item.id.videoId,
    title: item.snippet.title,
    thumbnail:
      item.snippet.thumbnails.medium?.url ??
      item.snippet.thumbnails.default?.url ??
      '',
    publishedAt: item.snippet.publishedAt,
  };
}

/** Full watch URL for a YouTube video. */
export function getYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** YouTube channel URL (falls back to youtube.com if channel ID not set). */
export function getYoutubeChannelUrl(): string {
  if (CHANNEL_ID) return `https://www.youtube.com/channel/${CHANNEL_ID}`;
  return 'https://www.youtube.com';
}
