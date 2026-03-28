/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#3b82f6';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#0f172a',
    background: '#f0f4f8',
    tint: tintColorLight,
    icon: '#64748b',
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const AppTheme = {
  // Primary
  primary:      '#3b82f6',
  primaryDark:  '#2563eb',
  primaryDeep:  '#1d4ed8',
  primaryLight: '#dbeafe',
  primaryFaint: '#eff6ff',

  // Accent (purple)
  accent:       '#8b5cf6',
  accentLight:  '#ede9fe',

  // Navy (headers, dark sections)
  navy:         '#0f172a',
  navyLight:    '#1e293b',
  navyMid:      '#334155',

  // Backgrounds
  background:   '#f0f4f8',
  surface:      '#ffffff',

  // Text
  textHeading:  '#0f172a',
  textBody:     '#334155',
  textSecondary:'#64748b',
  textMuted:    '#94a3b8',
  textOnDark:   '#ffffff',

  // Semantic
  success:      '#22c55e',
  successLight: '#dcfce7',
  danger:       '#ef4444',
  dangerLight:  '#fee2e2',
  warning:      '#f59e0b',
  warningLight: '#fef3c7',

  // Borders
  border:       '#e2e8f0',
  borderLight:  '#f1f5f9',

  // Shadow preset (spread into StyleSheet)
  cardShadow: {
    shadowColor:   '#000' as string,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  10,
    elevation:     3,
  },

  // Radii
  radiusCard:   14,
  radiusInput:  10,
  radiusBadge:  20,
  radiusButton: 12,
};
