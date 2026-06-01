import { CHURCH } from '../../../constants/theme';

export interface OnboardingSlideData {
  id: string;
  icon: string;
  verse: string;
  ref: string;
  title: string;
  sub: string;
  eyebrow: string;
}

export const SLIDES: OnboardingSlideData[] = [
  {
    id: '1',
    icon: 'sparkles-outline',
    verse: '"Where two or three gather in my name, there am I with them."',
    ref: 'Matthew 18:20',
    title: 'Welcome to Gather',
    sub: `The digital home of ${CHURCH.name}`,
    eyebrow: 'Royal welcome',
  },
  {
    id: '2',
    icon: 'book-outline',
    verse: '"Trust in the Lord with all your heart and lean not on your own understanding."',
    ref: 'Proverbs 3:5',
    title: 'Grow in the Word',
    sub: 'Daily verses, reading plans, highlights, and notes in one calm rhythm.',
    eyebrow: 'Daily formation',
  },
  {
    id: '3',
    icon: 'people-outline',
    verse: '"And let us consider how we may spur one another on toward love and good deeds."',
    ref: 'Hebrews 10:24',
    title: 'Stay Connected',
    sub: 'Prayer, group chats, events, and live worship for the whole church family.',
    eyebrow: 'Church community',
  },
];
