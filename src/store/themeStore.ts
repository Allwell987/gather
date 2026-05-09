// src/store/themeStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AccentKey,
  AccentTheme,
  ACCENT_THEMES,
  FontStyle,
  FontConfig,
  FONT_STYLES,
  DEFAULT_FONT_STYLE,
  applyTypographyFontConfig,
  ThemeMode,
  SemanticColors,
  Typography
} from '../constants/theme';
import { Appearance } from 'react-native';

interface ThemeState {
  accentKey: AccentKey;
  accent: AccentTheme;
  theme: AccentTheme;
  fontStyle: FontStyle;
  fontConfig: FontConfig;
  themeMode: ThemeMode;
  typography: typeof Typography;
  colors: typeof SemanticColors.light & {
    accent: string;
    accentDeep: string;
    accentMid: string;
    accentLight: string;
    accentBorder: string;
    accentSubtle: string;
  };
  setAccent: (key: AccentKey) => void;
  setFontStyle: (key: FontStyle) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const getTypography = (config: FontConfig) => {
  return {
    ...Typography,
    serif: config.serif,
    serifItalic: config.serifItalic,
    sans: config.sans,
    sansMedium: config.sansMedium,
    sansSemiBold: config.sansSemiBold,
    caption: { ...Typography.caption, fontFamily: config.sans },
    body2: { ...Typography.body2, fontFamily: config.sans },
    body1: { ...Typography.body1, fontFamily: config.sans },
    heading3: { ...Typography.heading3, fontFamily: config.serif },
    heading2: { ...Typography.heading2, fontFamily: config.serif },
  };
};

const getColors = (mode: ThemeMode, accent: AccentTheme) => {
  const baseColors = mode === 'system'
    ? (Appearance.getColorScheme() === 'dark' ? SemanticColors.dark : SemanticColors.light)
    : (mode === 'dark' ? SemanticColors.dark : SemanticColors.light);

  return {
    ...baseColors,
    accent: accent.accent,
    accentDeep: accent.accentDeep,
    accentMid: accent.accentMid,
    accentLight: accent.accentLight,
    accentBorder: accent.accentBorder,
    accentSubtle: accent.accentSubtle,
  };
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      accentKey: 'teal',
      accent: ACCENT_THEMES.find((t) => t.key === 'teal') ?? ACCENT_THEMES[0],
      theme: ACCENT_THEMES.find((t) => t.key === 'teal') ?? ACCENT_THEMES[0],
      fontStyle: 'elegant',
      fontConfig: DEFAULT_FONT_STYLE,
      themeMode: 'system',
      typography: getTypography(DEFAULT_FONT_STYLE),
      colors: getColors('system', ACCENT_THEMES.find((t) => t.key === 'teal') ?? ACCENT_THEMES[0]),

      setAccent: (key: AccentKey) => {
        const accent = ACCENT_THEMES.find((t) => t.key === key) ?? ACCENT_THEMES[0];
        set({
          accentKey: key,
          accent,
          theme: accent,
          colors: getColors(get().themeMode, accent)
        });
      },

      setFontStyle: (key: FontStyle) => {
        const fontConfig = FONT_STYLES.find((f) => f.key === key) ?? DEFAULT_FONT_STYLE;
        set({ fontStyle: key, fontConfig, typography: getTypography(fontConfig) });
      },

      setThemeMode: (mode: ThemeMode) => {
        set({ themeMode: mode, colors: getColors(mode, get().accent) });
      },
    }),
    {
      name: 'gather-theme',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.colors = getColors(state.themeMode, state.accent);
          state.theme = state.accent;
          state.typography = getTypography(state.fontConfig ?? DEFAULT_FONT_STYLE);
        }
      },
    }
  )
);

// Listen for system theme changes if mode is 'system'
Appearance.addChangeListener(({ colorScheme }) => {
  const { themeMode, setThemeMode } = useThemeStore.getState();
  if (themeMode === 'system') {
    setThemeMode('system');
  }
});
