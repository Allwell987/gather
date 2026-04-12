// src/types/bible.ts
export type BibleTranslation =
  | 'kjv'
  | 'bbe'
  | 'web'
  | 'webbe'
  | 'oeb-cw'
  | 'oeb-us'
  | 'almeida'
  | 'rvr09'
  | 'cherokee'
  | 't4t';

export interface BibleVersion {
  id: BibleTranslation;
  name: string;
  language: string;
}

/**
 * These are all open-source/public domain translations
 * compatible with the bible-api.com service.
 */
export const AVAILABLE_VERSIONS: BibleVersion[] = [
  { id: 'kjv', name: 'King James Version', language: 'English' },
  { id: 'web', name: 'World English Bible', language: 'English' },
  { id: 'webbe', name: 'World English Bible (British)', language: 'English' },
  { id: 'bbe', name: 'Bible in Basic English', language: 'English' },
  { id: 'oeb-us', name: 'Open English Bible (US)', language: 'English' },
  { id: 'oeb-cw', name: 'Open English Bible (CW)', language: 'English' },
  { id: 'almeida', name: 'João Ferreira de Almeida', language: 'Portuguese' },
  { id: 'rvr09', name: 'Reina Valera 1909', language: 'Spanish' },
  { id: 't4t', name: 'Translation for Translators', language: 'English' },
  { id: 'cherokee', name: 'Cherokee New Testament', language: 'Cherokee' },
];

export interface BibleVerse {
  num: number;
  text: string;
}

export interface BibleChapter {
  book: string;
  chapter: number;
  verses: BibleVerse[];
  translation?: BibleTranslation;
}

export interface BibleHighlight {
  verseNum: number;
  color: 'yellow' | 'blue' | 'green' | null;
  note?: string;
}
