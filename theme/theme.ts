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
  // secondary: '#1E3A8A', // Blue 900 - secondary UI elements (SettingsBar)
  // secondary: '#475569', // Slate 600 - medium slate-blue
  // secondary: '#334155', // Slate 700 - slightly lighter than primary
  // secondary: '#3730A3', // Indigo 800 - deep indigo with warmth
  secondary: '#3A506B', // Indigo 700 - slightly lighter than primary
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

  // Overlay/Glass effects - white (for dark backgrounds)
  overlay02: 'rgba(255,255,255,0.02)', // very subtle backgrounds
  overlay05: 'rgba(255,255,255,0.05)', // subtle backgrounds
  overlay08: 'rgba(255,255,255,0.08)', // input backgrounds
  overlay10: 'rgba(255,255,255,0.1)', // dividers, backgrounds
  overlay12: 'rgba(255,255,255,0.12)', // chip backgrounds
  overlay15: 'rgba(255,255,255,0.15)', // modal borders, hover states
  overlay20: 'rgba(255,255,255,0.2)', // input borders, button borders

  // Overlay/Glass effects - black (for modals, backdrops)
  overlayDark40: 'rgba(0,0,0,0.4)', // light backdrop
  overlayDark60: 'rgba(0,0,0,0.6)', // modal backdrop

  // Accent color overlays
  accentOverlay10: 'rgba(59,130,246,0.1)', // subtle accent bg
  accentOverlay15: 'rgba(59,130,246,0.15)', // accent button bg
  accentOverlay30: 'rgba(59,130,246,0.3)', // accent border

  // Danger color overlays
  dangerOverlay15: 'rgba(244,63,94,0.25)', // danger button bg

  // Success color overlays
  successOverlay15: 'rgba(16,185,129,0.25)', // success button bg

  // Indigo overlays (stats)
  indigoOverlay10: 'rgba(99,102,241,0.1)', // stat row bg
  indigoOverlay20: 'rgba(99,102,241,0.2)', // stat highlight bg
  indigoOverlay30: 'rgba(99,102,241,0.3)', // stat border

  // Semantic
  disabled: '#94A3B8', // Slate 400 - disabled state

  // Contrast labels
  textOnAccent: '#FFFFFF',
} as const;

// =============================================================================
// UNUSED THEMES (kept for future use)
// =============================================================================

// /**
//  * Option 2: "Court Classic" — Clean & Professional
//  * Crisp, professional look inspired by sports broadcasts.
//  */
// const courtClassic = {
//   // Core
//   primary: '#1E293B', // Graphite
//   surface: '#FFFFFF', // Pure White
//
//   // UI Accents
//   accent: '#0EA5E9', // Sky Blue
//   success: '#14B8A6', // Teal
//   danger: '#EF4444', // Red
//   warning: '#F97316', // Orange
//
//   // Text
//   textPrimary: '#111827', // Gray 900
//   textSecondary: '#6B7280', // Gray 500
//   textMuted: '#9CA3AF', // Gray 400
//   textInverse: '#FFFFFF', // White
//
//   // Borders & Backgrounds
//   border: '#E5E7EB', // Gray 200
//   borderLight: '#F3F4F6', // Gray 100
//   inputBg: '#F9FAFB', // Gray 50
//   cardBg: '#FFFFFF', // White
//   cardBgAlt: '#F9FAFB', // Gray 50
//   shadow: '#000000',
//
//   // Overlay/Glass effects
//   overlay10: 'rgba(255,255,255,0.1)',
//   overlay20: 'rgba(255,255,255,0.2)',
//
//   // Semantic
//   disabled: '#9CA3AF', // Gray 400
// } as const;

// /**
//  * Option 3: "Sunset Energy" — Bold & Dynamic
//  * Warmer palette with coral accents. Stands out and feels energetic.
//  */
// const sunsetEnergy = {
//   // Core
//   primary: '#18181B', // Rich Black
//   surface: '#FAFAFA', // Warm White
//
//   // UI Accents
//   accent: '#FF6B6B', // Coral
//   success: '#22C55E', // Spring Green
//   danger: '#DC2626', // Crimson
//   warning: '#EAB308', // Gold
//
//   // Text
//   textPrimary: '#18181B', // Zinc 900
//   textSecondary: '#71717A', // Zinc 500
//   textMuted: '#A1A1AA', // Zinc 400
//   textInverse: '#FFFFFF', // White
//
//   // Borders & Backgrounds
//   border: '#E4E4E7', // Zinc 200
//   borderLight: '#F4F4F5', // Zinc 100
//   inputBg: '#F4F4F5', // Zinc 100
//   cardBg: '#FAFAFA', // Zinc 50
//   cardBgAlt: '#F4F4F5', // Zinc 100
//   shadow: '#000000',
//
//   // Overlay/Glass effects
//   overlay10: 'rgba(255,255,255,0.1)',
//   overlay20: 'rgba(255,255,255,0.2)',
//
//   // Semantic
//   disabled: '#A1A1AA', // Zinc 400
// } as const;

// =============================================================================
// ACTIVE PALETTE (default export for backwards compatibility during migration)
// =============================================================================

// =============================================================================
// ACTIVE PALETTE (default export for backwards compatibility during migration)
// =============================================================================

export const darkPalette = {
  ...midnightElectric,
  // Modal colors now match app theme (Navy in dark mode)
  modalBg: '#0F172A', // Navy - same as primary
  modalText: '#FFFFFF', // White text on navy
  overlayModal: 'rgba(0,0,0,0.6)', // Darker backdrop for dark theme
  // Glass/floating bar backgrounds
  glassBg: 'rgba(15, 23, 42, 0.92)', // Dark slate with transparency
};

/**
 * Light Theme — High Visibility for Outdoor Use
 * Bright backgrounds with dark text for sunlight readability.
 */
export const lightPalette = {
  // Core
  primary: '#FFFFFF', // White - main light color
  surface: '#0F172A', // Deep Navy - for contrast elements

  // Modal colors now match app theme (White in light mode)
  modalBg: '#FFFFFF', // White - same as primary
  modalText: '#0F172A', // Dark text on white

  // UI Accents
  secondary: '#E2E8F0', // Slate 200 - secondary UI elements
  accent: '#2563EB', // Blue 600 - primary interactive (slightly darker for contrast)
  success: '#059669', // Emerald 600 - positive stats, goals
  danger: '#DC2626', // Red 600 - negative stats, errors
  warning: '#D97706', // Amber 600 - turnovers, caution

  // Text
  textPrimary: '#F8FAFC', // Slate 50 - main text on dark bg
  textSecondary: '#94A3B8', // Slate 400 - muted text
  textMuted: '#64748B', // Slate 500 - placeholders, hints
  textInverse: '#0F172A', // Slate 900 - text on light bg

  // Borders & Backgrounds
  border: '#CBD5E1', // Slate 300 - input borders, dividers
  borderLight: '#E2E8F0', // Slate 200 - subtle dividers
  inputBg: '#F1F5F9', // Slate 100 - input backgrounds
  cardBg: '#FFFFFF', // White - card backgrounds
  cardBgAlt: '#F8FAFC', // Slate 50 - alternating rows
  shadow: '#000000', // Shadow color (use with opacity)

  // Overlay/Glass effects - black (for light backgrounds)
  overlay02: 'rgba(0,0,0,0.02)', // very subtle backgrounds
  overlay05: 'rgba(0,0,0,0.05)', // subtle backgrounds
  overlay08: 'rgba(0,0,0,0.08)', // input backgrounds
  overlay10: 'rgba(0,0,0,0.1)', // dividers, backgrounds
  overlay12: 'rgba(0,0,0,0.12)', // chip backgrounds
  overlay15: 'rgba(0,0,0,0.15)', // modal borders, hover states
  overlay20: 'rgba(0,0,0,0.2)', // input borders, button borders
  overlayModal: 'rgba(0,0,0,0.3)', // Lighter backdrop for light theme

  // Overlay/Glass effects - dark (for modals, backdrops)
  overlayDark40: 'rgba(0,0,0,0.4)', // light backdrop
  overlayDark60: 'rgba(0,0,0,0.6)', // modal backdrop

  // Accent color overlays
  accentOverlay10: 'rgba(37,99,235,0.1)', // subtle accent bg
  accentOverlay15: 'rgba(37,99,235,0.15)', // accent button bg
  accentOverlay30: 'rgba(37,99,235,0.3)', // accent border

  // Danger color overlays
  dangerOverlay15: 'rgba(220,38,38,0.15)', // danger button bg

  // Success color overlays
  successOverlay15: 'rgba(5,150,105,0.15)', // success button bg

  // Indigo overlays (stats)
  indigoOverlay10: 'rgba(79,70,229,0.1)', // stat row bg
  indigoOverlay20: 'rgba(79,70,229,0.2)', // stat highlight bg
  indigoOverlay30: 'rgba(79,70,229,0.3)', // stat border

  // Semantic
  disabled: '#9CA3AF', // Gray 400 - disabled state

  // Contrast labels
  textOnAccent: '#FFFFFF',

  // Glass/floating bar backgrounds
  glassBg: 'rgba(255, 255, 255, 0.95)', // White with transparency
} as const;

// Default palette export (for backwards compatibility during migration)
export const palette = midnightElectric;

// Type for palette - using mapped type to ensure structural compatibility
export type Palette = {
  [K in keyof typeof midnightElectric]: string;
} & {
  modalBg: string;
  modalText: string;
  overlayModal: string;
  textOnAccent: string;
  glassBg: string;
};

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
