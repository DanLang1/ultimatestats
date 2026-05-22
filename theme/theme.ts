/**
 * Theme configuration for U-Stat app
 * Switch between color schemes by changing the `palette` export below
 */

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
  gold: '#F59E0B', // Gold - Break segments in game breakdown
  neutral: '#64748B', // Slate 500 - informational/undo toasts

  // Text
  textPrimary: '#0F172A', // Slate 900 - main text on light bg
  textSecondary: '#64748B', // Slate 500 - muted text
  textMuted: '#94A3B8', // Slate 400 - placeholders, hints
  textInverse: '#FFFFFF', // White - text on dark bg

  // Borders & Backgrounds
  border: '#E2E8F0', // Slate 200 - input borders, dividers
  borderLight: '#F1F5F9', // Slate 100 - subtle dividers
  inputBg: '#F1F5F9', // Slate 100 - input backgrounds
  inputText: '#0F172A', // Slate 900 - text in inputs (always dark)
  cardBg: '#F8FAFC', // Slate 50 - card backgrounds
  cardBgAlt: '#F1F5F9', // Slate 100 - alternating rows
  trackerActionCardBg: '#1E293B', // Slate 800 - tracker action surface on dark screens
  trackerActionCardBorder: 'rgba(255,255,255,0.15)', // tracker action card border on dark screens
  timelineLineupChipBg: 'rgba(255,255,255,0.1)', // subdued lineup chip surface on dark cards
  timelineLineupChipBorder: 'rgba(255,255,255,0.2)', // lineup chip border on dark cards
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
  overlayDark05: 'rgba(0,0,0,0.05)', // very subtle dark tint (always dark, unlike overlay05)
  overlayDark40: 'rgba(0,0,0,0.4)', // light backdrop
  overlayDark60: 'rgba(0,0,0,0.6)', // modal backdrop
  overlayDark70: 'rgba(0,0,0,0.7)', // alert backdrops
  overlayDark88: 'rgba(0,0,0,0.88)', // game overlay screens (halftime, timeout)

  // Accent color overlays
  accentOverlay10: 'rgba(59,130,246,0.1)', // subtle accent bg
  accentOverlay15: 'rgba(59,130,246,0.15)', // accent button bg
  accentOverlay30: 'rgba(59,130,246,0.3)', // accent border

  // Danger color overlays
  dangerOverlay10: 'rgba(244,63,94,0.1)', // subtle danger bg
  dangerOverlay15: 'rgba(244,63,94,0.25)', // danger button bg

  // Success color overlays
  successOverlay10: 'rgba(16,185,129,0.1)', // subtle success bg
  successOverlay15: 'rgba(16,185,129,0.25)', // success button bg

  // Warning color overlays
  warningOverlay10: 'rgba(245,158,11,0.1)', // subtle warning bg
  warningOverlay15: 'rgba(245,158,11,0.15)', // warning badge bg

  // Indigo overlays (stats)
  indigoOverlay10: 'rgba(99,102,241,0.1)', // stat row bg
  indigoOverlay20: 'rgba(99,102,241,0.2)', // stat highlight bg
  indigoOverlay30: 'rgba(99,102,241,0.3)', // stat border

  // Semantic
  disabled: '#94A3B8', // Slate 400 - disabled state

  // Player matching type colors
  mmpColor: '#60A5FA', // Blue 400 - male matching player names
  fmpColor: '#F472B6', // Pink 400 - female matching player names
  dLineAccent: '#C026D3', // Fuchsia 600 - D-line accent in playing time

  // Contrast labels
  // Contrast labels
  textOnAccent: '#FFFFFF',
  textOnAccentMuted: 'rgba(255,255,255,0.7)', // muted text on colored buttons/banners

  // Lock Screen (Fixed Contrast)
  lockScreenText: '#FFFFFF',
  lockScreenBtnPrimaryBg: '#FFFFFF',
  lockScreenBtnPrimaryText: '#0F172A',
  lockScreenBtnSecondaryBg: 'rgba(255, 255, 255, 0.1)',
  lockScreenBtnSecondaryBorder: 'rgba(255, 255, 255, 0.5)',

  // Brand Colors (Discord)
  discordBg: '#5865F2',
  discordText: '#FFFFFF',
  discordTextMuted: 'rgba(255, 255, 255, 0.7)',
} as const;

// =============================================================================
// ACTIVE PALETTE (default export for backwards compatibility during migration)
// =============================================================================

export const darkPalette = {
  ...midnightElectric,
  // Modal colors now match app theme (Navy in dark mode)
  modalBg: '#0F172A', // Navy - same as primary
  modalText: '#FFFFFF', // White text on navy
  modalTextMuted: '#94A3B8', // Slate 400 - muted text on navy
  overlayModal: 'rgba(0,0,0,0.6)', // Darker backdrop for dark theme
  // Glass/floating bar backgrounds
  glassBg: 'rgba(15, 23, 42, 0.92)', // Dark slate with transparency
  // App chrome (status bar area, safe area insets) — always Navy regardless of theme
  chrome: '#0F172A',
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
  modalTextMuted: '#64748B', // Slate 500 - muted text on white

  // UI Accents
  secondary: '#E2E8F0', // Slate 200 - secondary UI elements
  accent: '#2563EB', // Blue 600 - primary interactive (slightly darker for contrast)
  success: '#059669', // Emerald 600 - positive stats, goals
  danger: '#DC2626', // Red 600 - negative stats, errors
  warning: '#D97706', // Amber 600 - turnovers, caution
  gold: '#EAB308', // Gold - Break segments in game breakdown
  neutral: '#475569', // Slate 600 - informational/undo toasts

  // Text
  textPrimary: '#F8FAFC', // Slate 50 - main text on dark bg
  textSecondary: '#94A3B8', // Slate 400 - muted text
  textMuted: '#64748B', // Slate 500 - placeholders, hints
  textInverse: '#0F172A', // Slate 900 - text on light bg

  // Borders & Backgrounds
  border: '#CBD5E1', // Slate 300 - input borders, dividers
  borderLight: '#E2E8F0', // Slate 200 - subtle dividers
  inputBg: '#F1F5F9', // Slate 100 - input backgrounds
  inputText: '#0F172A', // Slate 900 - text in inputs (always dark)
  cardBg: '#FFFFFF', // White - card backgrounds
  cardBgAlt: '#F8FAFC', // Slate 50 - alternating rows
  trackerActionCardBg: '#FFFFFF', // tracker action surface on light screens
  trackerActionCardBorder: '#E2E8F0', // tracker action card border on light screens
  timelineLineupChipBg: '#FFFFFF', // lineup chip surface on light cards
  timelineLineupChipBorder: '#CBD5E1', // lineup chip border on light cards
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
  overlayDark05: 'rgba(0,0,0,0.05)', // very subtle dark tint (always dark, unlike overlay05)
  overlayDark40: 'rgba(0,0,0,0.4)', // light backdrop
  overlayDark60: 'rgba(0,0,0,0.6)', // modal backdrop
  overlayDark70: 'rgba(0,0,0,0.7)', // alert backdrops
  overlayDark88: 'rgba(0,0,0,0.88)', // game overlay screens (halftime, timeout)

  // Accent color overlays
  accentOverlay10: 'rgba(37,99,235,0.1)', // subtle accent bg
  accentOverlay15: 'rgba(37,99,235,0.15)', // accent button bg
  accentOverlay30: 'rgba(37,99,235,0.3)', // accent border

  // Danger color overlays
  dangerOverlay10: 'rgba(220,38,38,0.1)', // subtle danger bg
  dangerOverlay15: 'rgba(220,38,38,0.15)', // danger button bg

  // Success color overlays
  successOverlay10: 'rgba(5,150,105,0.1)', // subtle success bg
  successOverlay15: 'rgba(5,150,105,0.15)', // success button bg

  // Warning color overlays
  warningOverlay10: 'rgba(217,119,6,0.1)', // subtle warning bg
  warningOverlay15: 'rgba(217,119,6,0.15)', // warning badge bg

  // Indigo overlays (stats)
  indigoOverlay10: 'rgba(79,70,229,0.1)', // stat row bg
  indigoOverlay20: 'rgba(79,70,229,0.2)', // stat highlight bg
  indigoOverlay30: 'rgba(79,70,229,0.3)', // stat border

  // Semantic
  disabled: '#9CA3AF', // Gray 400 - disabled state

  // Player matching type colors
  mmpColor: '#2563EB', // Blue 600 - male matching player names (darker for light bg)
  fmpColor: '#DB2777', // Pink 600 - female matching player names (darker for light bg)
  dLineAccent: '#A21CAF', // Fuchsia 700 - D-line accent in playing time

  // Contrast labels
  textOnAccent: '#FFFFFF',
  textOnAccentMuted: 'rgba(255,255,255,0.7)', // muted text on colored buttons/banners

  // Glass/floating bar backgrounds
  glassBg: 'rgba(255, 255, 255, 0.95)', // White with transparency
  // App chrome (status bar area, safe area insets) — always Navy regardless of theme
  chrome: '#0F172A',

  // Lock Screen (Fixed Contrast)
  lockScreenText: '#FFFFFF',
  lockScreenBtnPrimaryBg: '#FFFFFF',
  lockScreenBtnPrimaryText: '#0F172A',
  lockScreenBtnSecondaryBg: 'rgba(255, 255, 255, 0.1)',
  lockScreenBtnSecondaryBorder: 'rgba(255, 255, 255, 0.5)',

  // Brand Colors (Discord)
  discordBg: '#5865F2',
  discordText: '#FFFFFF',
  discordTextMuted: 'rgba(255, 255, 255, 0.7)',
} as const;

// Default palette export (for backwards compatibility during migration)
export const palette = midnightElectric;

// Type for palette - using mapped type to ensure structural compatibility
export type Palette = {
  [K in keyof typeof midnightElectric]: string;
} & {
  modalBg: string;
  modalText: string;
  modalTextMuted: string;
  overlayModal: string;
  textOnAccent: string;
  glassBg: string;
  trackerActionCardBg: string;
  trackerActionCardBorder: string;
  chrome: string;
  lockScreenText: string;
  lockScreenBtnPrimaryBg: string;
  lockScreenBtnPrimaryText: string;
  lockScreenBtnSecondaryBg: string;
  lockScreenBtnSecondaryBorder: string;
};

// =============================================================================
// FONTS
// =============================================================================

export const Fonts = {
  regular: 'Inter-Regular',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
  black: 'Inter-Black',
} as const;

// =============================================================================
// TUTORIAL COLORS
// Fixed demo team colors used in the interactive tutorial scoreboard.
// Not palette tokens — these don't vary by theme.
// =============================================================================

export const TutorialColors = {
  team1Bg: '#1A3A7A', // USA navy
  team2Bg: '#C41E3A', // Canada red
} as const;
