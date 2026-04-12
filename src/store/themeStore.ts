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
  SemanticColors
} from '../constants/theme';
import { Appearance } from 'react-native';

interface ThemeState {
  accentKey: AccentKey;
  accent: AccentTheme;
  theme: AccentTheme;
  fontStyle: FontStyle;
  fontConfig: FontConfig;
  themeMode: ThemeMode;
  colors: typeof SemanticColors.light;
  setAccent: (key: AccentKey) => void;
  setFontStyle: (key: FontStyle) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const getColors = (mode: ThemeMode) => {
  if (mode === 'system') {
    const systemScheme = Appearance.getColorScheme();
    return systemScheme === 'dark' ? SemanticColors.dark : SemanticColors.light;
  }
  return mode === 'dark' ? SemanticColors.dark : SemanticColors.light;
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
      colors: getColors('system'),

      setAccent: (key: AccentKey) => {
        const accent = ACCENT_THEMES.find((t) => t.key === key) ?? ACCENT_THEMES[0];
        set({ accentKey: key, accent, theme: accent });
      },

      setFontStyle: (key: FontStyle) => {
        const fontConfig = FONT_STYLES.find((f) => f.key === key) ?? DEFAULT_FONT_STYLE;
        applyTypographyFontConfig(fontConfig);
        set({ fontStyle: key, fontConfig });
      },

      setThemeMode: (mode: ThemeMode) => {
        set({ themeMode: mode, colors: getColors(mode) });
      },
    }),
    {
      name: 'gather-theme',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.colors = getColors(state.themeMode);
          state.theme = state.accent;
          applyTypographyFontConfig(state.fontConfig ?? DEFAULT_FONT_STYLE);
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
