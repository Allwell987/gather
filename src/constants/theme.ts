// src/constants/theme.ts
import type { TextStyle } from 'react-native';

export type AccentKey =
  | 'sapphire'
  | 'purple'
  | 'emerald'
  | 'crimson'
  | 'orange'
  | 'rose'
  | 'teal';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AccentTheme {
  key: AccentKey;
  name: string;
  accent: string;
  accentDeep: string;
  accentMid: string;
  accentLight: string;
  accentBorder: string;
  accentSubtle: string;
  emoji: string;
}

export const ACCENT_THEMES: AccentTheme[] = [
  {
    key: 'sapphire',
    name: 'Sapphire Blue',
    accent: '#1a56db',
    accentDeep: '#1341b0',
    accentMid: '#2563eb',
    accentLight: '#e8f0fe',
    accentBorder: '#93c5fd',
    accentSubtle: 'rgba(26,86,219,0.15)',
    emoji: '🔵',
  },
  {
    key: 'purple',
    name: 'Royal Purple',
    accent: '#7c3aed',
    accentDeep: '#6d28d9',
    accentMid: '#8b5cf6',
    accentLight: '#ede9fe',
    accentBorder: '#c4b5fd',
    accentSubtle: 'rgba(124,58,237,0.15)',
    emoji: '🟣',
  },
  {
    key: 'emerald',
    name: 'Emerald Green',
    accent: '#059669',
    accentDeep: '#047857',
    accentMid: '#10b981',
    accentLight: '#d1fae5',
    accentBorder: '#6ee7b7',
    accentSubtle: 'rgba(5,150,105,0.15)',
    emoji: '🟢',
  },
  {
    key: 'crimson',
    name: 'Crimson Red',
    accent: '#dc2626',
    accentDeep: '#b91c1c',
    accentMid: '#ef4444',
    accentLight: '#fee2e2',
    accentBorder: '#fca5a5',
    accentSubtle: 'rgba(220,38,38,0.15)',
    emoji: '🔴',
  },
  {
    key: 'orange',
    name: 'Burnt Orange',
    accent: '#ea580c',
    accentDeep: '#c2410c',
    accentMid: '#f97316',
    accentLight: '#ffedd5',
    accentBorder: '#fdba74',
    accentSubtle: 'rgba(234,88,12,0.15)',
    emoji: '🟠',
  },
  {
    key: 'rose',
    name: 'Rose Pink',
    accent: '#db2777',
    accentDeep: '#be185d',
    accentMid: '#ec4899',
    accentLight: '#fce7f3',
    accentBorder: '#f9a8d4',
    accentSubtle: 'rgba(219,39,119,0.15)',
    emoji: '🩷',
  },
  {
    key: 'teal',
    name: 'Teal',
    accent: '#0d9488',
    accentDeep: '#0f766e',
    accentMid: '#14b8a6',
    accentLight: '#ccfbf1',
    accentBorder: '#5eead4',
    accentSubtle: 'rgba(13,148,136,0.15)',
    emoji: '🩵',
  },
];

export const BaseColors = {
  // Common
  white: '#ffffff',
  black: '#000000',
  sapphire: '#1a56db',
  gold: '#c9922a',
  goldDeep: '#a87520',
  goldLight: '#f5e6c4',
  sage: '#52775a',
  sageMid: '#3d5c42',
  sageLight: '#eef4f0',
  online: '#4ade80',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  green100: '#dcfce7',
  green700: '#15803d',
  red50: '#fef2f2',
  red100: '#fee2e2',
  red500: '#ef4444',
  red600: '#dc2626',
  red700: '#b91c1c',
  danger: '#dc2626',
  dangerLight: '#fef2f2',
  yellow700: '#b45309',
  yellow100: '#fef3c7',
  brown100: '#ede0cc',
  brown200: '#d4bc98',
  brown300: '#b8986a',
  brown400: '#8a6840',
  brown700: '#3d2c14',
  brown800: '#2e1f0e',
  brown900: '#1e140a',
  cream: '#fdfaf5',
  warm50: '#fef9ee',
  warm100: '#fdefd0',
};

export const SemanticColors = {
  light: {
    background: '#f8f4ee',
    surface: '#fefcf8',
    text: '#20160d',
    textSecondary: '#72583c',
    textMuted: '#9c8468',
    border: '#e8dccb',
    card: '#fffdf9',
    error: '#ef4444',
    success: '#52775a',
  },
  dark: {
    background: '#17120d',
    surface: '#231b14',
    text: '#f7f2ea',
    textSecondary: '#d8c3a8',
    textMuted: '#a88f75',
    border: '#3a2e22',
    card: '#241c15',
    error: '#f87171',
    success: '#34d399',
  },
};

const typographySizes = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

export type FontStyle = 'modern' | 'classic' | 'elegant';

export interface FontConfig {
  key: FontStyle;
  name: string;
  serif: string;
  serifItalic: string;
  sans: string;
  sansMedium: string;
  sansSemiBold: string;
  preview: string;
}

export const FONT_STYLES: FontConfig[] = [
  {
    key: 'modern',
    name: 'Modern',
    serif: 'PlayfairDisplay_700Bold',
    serifItalic: 'PlayfairDisplay_400Regular_Italic',
    sans: 'PlusJakartaSans_400Regular',
    sansMedium: 'PlusJakartaSans_500Medium',
    sansSemiBold: 'PlusJakartaSans_600SemiBold',
    preview: 'Clean & contemporary',
  },
  {
    key: 'classic',
    name: 'Classic',
    serif: 'Merriweather_700Bold',
    serifItalic: 'Merriweather_400Regular_Italic',
    sans: 'Nunito_400Regular',
    sansMedium: 'Nunito_500Medium',
    sansSemiBold: 'Nunito_600SemiBold',
    preview: 'Traditional & readable',
  },
  {
    key: 'elegant',
    name: 'Elegant',
    serif: 'Lora_700Bold',
    serifItalic: 'Lora_400Regular_Italic',
    sans: 'Poppins_400Regular',
    sansMedium: 'Poppins_500Medium',
    sansSemiBold: 'Poppins_600SemiBold',
    preview: 'Sophisticated & stylish',
  },
];

export const DEFAULT_FONT_STYLE = FONT_STYLES[2];

export const Typography = {
  serif: DEFAULT_FONT_STYLE.serif,
  serifItalic: DEFAULT_FONT_STYLE.serifItalic,
  sans: DEFAULT_FONT_STYLE.sans,
  sansMedium: DEFAULT_FONT_STYLE.sansMedium,
  sansSemiBold: DEFAULT_FONT_STYLE.sansSemiBold,
  caption: {
    fontFamily: DEFAULT_FONT_STYLE.sans,
    fontSize: typographySizes.sm,
    lineHeight: 16,
  } as TextStyle,
  body2: {
    fontFamily: DEFAULT_FONT_STYLE.sans,
    fontSize: typographySizes.base,
    lineHeight: 20,
  } as TextStyle,
  body1: {
    fontFamily: DEFAULT_FONT_STYLE.sans,
    fontSize: typographySizes.md,
    lineHeight: 24,
  } as TextStyle,
  heading3: {
    fontFamily: DEFAULT_FONT_STYLE.serif,
    fontSize: typographySizes.xl,
    lineHeight: 28,
  } as TextStyle,
  heading2: {
    fontFamily: DEFAULT_FONT_STYLE.serif,
    fontSize: typographySizes['2xl'],
    lineHeight: 32,
  } as TextStyle,
  sizes: typographySizes,
};

export const applyTypographyFontConfig = (fontConfig: FontConfig) => {
  Typography.serif = fontConfig.serif;
  Typography.serifItalic = fontConfig.serifItalic;
  Typography.sans = fontConfig.sans;
  Typography.sansMedium = fontConfig.sansMedium;
  Typography.sansSemiBold = fontConfig.sansSemiBold;
  Typography.caption.fontFamily = fontConfig.sans;
  Typography.body2.fontFamily = fontConfig.sans;
  Typography.body1.fontFamily = fontConfig.sans;
  Typography.heading3.fontFamily = fontConfig.serif;
  Typography.heading2.fontFamily = fontConfig.serif;
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const CHURCH = {
  name: 'The Wealth Reality Church',
  location: 'Warri, Delta State',
  country: 'Nigeria',
  fullLocation: 'Warri, Delta State, Nigeria',
};

export const DAILY_VERSE = {
  text: '"Trust in the Lord with all your heart and lean not on your own understanding."',
  reference: 'Proverbs 3:5',
};
