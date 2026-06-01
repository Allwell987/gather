import * as Localization from 'expo-localization';

export type AppLocale = 'en' | 'fr';
export type TranslationKey =
  | 'today'
  | 'dailyDevotional'
  | 'markAsRead'
  | 'readDone'
  | 'noDevotionalToday'
  | 'savedAtPhrase'
  | 'savedOfflineTitle'
  | 'savedOfflineRsvp'
  | 'savedOfflinePrayer'
  | 'liveLabel'
  | 'share';

const LOCALE_CODES: Record<AppLocale, string> = {
  en: 'en-US',
  fr: 'fr-FR',
};

const TRANSLATIONS: Record<AppLocale, Record<TranslationKey, string>> = {
  en: {
    today: 'Today',
    dailyDevotional: 'Daily Devotional',
    markAsRead: 'Mark as Read',
    readDone: 'Read ✓',
    noDevotionalToday: 'No devotional today.',
    savedAtPhrase: 'Saved {date} at {time}',
    savedOfflineTitle: 'Saved offline',
    savedOfflineRsvp: 'Your RSVP will sync automatically when you are back online.',
    savedOfflinePrayer: 'Your prayer request will post when you are back online.',
    liveLabel: 'LIVE:',
    share: 'Share',
  },
  fr: {
    today: "Aujourd'hui",
    dailyDevotional: 'Dévotion quotidienne',
    markAsRead: 'Marquer comme lu',
    readDone: 'Lu ✓',
    noDevotionalToday: 'Aucune dévotion aujourd’hui.',
    savedAtPhrase: 'Enregistré le {date} à {time}',
    savedOfflineTitle: 'Enregistré hors ligne',
    savedOfflineRsvp: 'Votre RSVP sera synchronisé automatiquement lorsque vous serez de nouveau en ligne.',
    savedOfflinePrayer: 'Votre demande de prière sera publiée lorsque vous serez de nouveau en ligne.',
    liveLabel: 'EN DIRECT :',
    share: 'Partager',
  },
};

export const getDeviceLocale = (): AppLocale => {
  const rawLocale = Localization.getLocales()?.[0]?.languageCode ?? 'en';
  return rawLocale === 'fr' ? 'fr' : 'en';
};

export const t = (key: TranslationKey, locale?: AppLocale) => {
  const resolvedLocale = locale ?? getDeviceLocale();
  return TRANSLATIONS[resolvedLocale][key] ?? TRANSLATIONS.en[key];
};

export const formatAppDate = (
  date: Date,
  options?: Intl.DateTimeFormatOptions,
  locale?: AppLocale
) => date.toLocaleDateString(LOCALE_CODES[locale ?? getDeviceLocale()], options);

export const formatAppTime = (
  date: Date,
  options?: Intl.DateTimeFormatOptions,
  locale?: AppLocale
) => date.toLocaleTimeString(LOCALE_CODES[locale ?? getDeviceLocale()], options);
