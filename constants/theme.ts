/**
 * Theme configuration for UltimateStats app
 * Switch between color schemes by changing the `palette` export below
 */

import { Platform } from 'react-native';

// =============================================================================
// COLOR SCHEMES
// =============================================================================

/**
 * Option 1: "Midnight Electric" — Dark & Vibrant
 * Sleek dark theme with electric blue accents. Modern, sporty, easy on the eyes.
 */
const midnightElectric = {
  // Core
  primary: '#0F172A', // Deep Navy - main dark color
  surface: '#F8FAFC', // Off White - light backgrounds

  // UI Accents
  accent: '#3B82F6', // Electric Blue - primary interactive
  success: '#10B981', // Emerald - positive stats, goals
  danger: '#F43F5E', // Rose - negative stats, errors
  warning: '#F59E0B', // Amber - turnovers, caution

  // Text
  textPrimary: '#0F172A', // Slate 900 - main text on light bg
  textSecondary: '#64748B', // Slate 500 - muted text
  textMuted: '#94A3B8', // Slate 400 - placeholders, hints
  textInverse: '#FFFFFF', // White - text on dark bg

  // Borders & Backgrounds
  border: '#E2E8F0', // Slate 200 - input borders, dividers
  borderLight: '#F1F5F9', // Slate 100 - subtle dividers
  inputBg: '#F1F5F9', // Slate 100 - input backgrounds
  cardBg: '#F8FAFC', // Slate 50 - card backgrounds
  cardBgAlt: '#F1F5F9', // Slate 100 - alternating rows
  shadow: '#000000', // Shadow color (use with opacity)

  // Semantic
  disabled: '#94A3B8', // Slate 400 - disabled state
} as const;

/**
 * Option 2: "Court Classic" — Clean & Professional
 * Crisp, professional look inspired by sports broadcasts.
 */
const courtClassic = {
  // Core
  primary: '#1E293B', // Graphite
  surface: '#FFFFFF', // Pure White

  // UI Accents
  accent: '#0EA5E9', // Sky Blue
  success: '#14B8A6', // Teal
  danger: '#EF4444', // Red
  warning: '#F97316', // Orange

  // Text
  textPrimary: '#111827', // Gray 900
  textSecondary: '#6B7280', // Gray 500
  textMuted: '#9CA3AF', // Gray 400
  textInverse: '#FFFFFF', // White

  // Borders & Backgrounds
  border: '#E5E7EB', // Gray 200
  borderLight: '#F3F4F6', // Gray 100
  inputBg: '#F9FAFB', // Gray 50
  cardBg: '#FFFFFF', // White
  cardBgAlt: '#F9FAFB', // Gray 50
  shadow: '#000000',

  // Semantic
  disabled: '#9CA3AF', // Gray 400
} as const;

/**
 * Option 3: "Sunset Energy" — Bold & Dynamic
 * Warmer palette with coral accents. Stands out and feels energetic.
 */
const sunsetEnergy = {
  // Core
  primary: '#18181B', // Rich Black
  surface: '#FAFAFA', // Warm White

  // UI Accents
  accent: '#FF6B6B', // Coral
  success: '#22C55E', // Spring Green
  danger: '#DC2626', // Crimson
  warning: '#EAB308', // Gold

  // Text
  textPrimary: '#18181B', // Zinc 900
  textSecondary: '#71717A', // Zinc 500
  textMuted: '#A1A1AA', // Zinc 400
  textInverse: '#FFFFFF', // White

  // Borders & Backgrounds
  border: '#E4E4E7', // Zinc 200
  borderLight: '#F4F4F5', // Zinc 100
  inputBg: '#F4F4F5', // Zinc 100
  cardBg: '#FAFAFA', // Zinc 50
  cardBgAlt: '#F4F4F5', // Zinc 100
  shadow: '#000000',

  // Semantic
  disabled: '#A1A1AA', // Zinc 400
} as const;

// =============================================================================
// ACTIVE PALETTE — Change this line to switch themes!
// =============================================================================

export const palette = midnightElectric;
//export const palette = courtClassic;
//export const palette = sunsetEnergy;

// Type for palette to ensure consistency
export type Palette = typeof midnightElectric;

// =============================================================================
// FONTS
// =============================================================================

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
