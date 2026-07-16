/**
 * Color utility functions for team color management
 */

/**
 * Common team colors for the preset picker
 */
export const TEAM_COLOR_PRESETS = [
  // Neutrals
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Black', hex: '#1A1A1A' },

  // ROYGBIV spectrum
  { name: 'Red', hex: '#DC2626' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Violet', hex: '#7C3AED' },

  // Popular team colors
  { name: 'Navy', hex: '#1E3A5F' },
  { name: 'Maroon', hex: '#7F1D1D' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Pink', hex: '#DB2777' },
  { name: 'Sky', hex: '#38BDF8' },
  { name: 'Lime', hex: '#84CC16' },
] as const;

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 formula
 */
function getLuminance(hex: string): number {
  // Handle invalid input
  if (!hex || typeof hex !== 'string') {
    return 0;
  }

  // Remove # if present
  let cleanHex = hex.replace('#', '');

  // Handle 8-char RGBA format (strip alpha)
  if (cleanHex.length === 8) {
    cleanHex = cleanHex.substring(0, 6);
  }

  // Handle 3-char shorthand
  if (cleanHex.length === 3) {
    cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
  }

  // Validate we have 6 chars
  if (cleanHex.length !== 6) {
    return 0;
  }

  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // Handle NaN from invalid hex chars
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return 0;
  }

  // Apply gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Returns black or white text color based on background color
 * Uses WCAG contrast ratio recommendations
 *
 * @param backgroundColor - Hex color string (e.g., '#FFFFFF' or 'FFFFFF')
 * @returns '#000000' for dark text or '#FFFFFF' for light text
 */
export function getContrastingTextColor(backgroundColor: string): '#000000' | '#FFFFFF' {
  const luminance = getLuminance(backgroundColor);
  // Use 0.179 as threshold (middle ground between pure luminance contrast)
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

/**
 * Convert a hex color to HSL components.
 * Returns null if the input is not a parseable hex color.
 */
function hexToHsl(hex: string): [number, number, number] | null {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.replace('#', '');
  if (clean.length === 8) clean = clean.substring(0, 6);
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  if (clean.length !== 6) return null;

  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return [h, s * 100, l * 100];
}

/**
 * Convert HSL components back to a hex color string.
 * h: 0–360, s: 0–100, l: 0–100
 */
function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Adjusts a hex color until it meets a minimum WCAG contrast ratio against
 * a given background color. Pushes toward light on dark backgrounds and
 * toward dark on light backgrounds, so it works correctly in both themes.
 *
 * Returns the original value unchanged if it is not a parseable hex color
 * (e.g. rgba strings from the palette are passed through as-is).
 *
 * Suggested ratios: 3.0 for UI elements (bars), 4.5 for body text (WCAG AA).
 */
export function ensureContrast(color: string, bgColor: string, minRatio: number): string {
  const hsl = hexToHsl(color);
  if (!hsl) return color;

  const bgLum = getLuminance(bgColor);
  const colorLum = getLuminance(color);
  if (contrastRatio(colorLum, bgLum) >= minRatio) return color;

  // On dark backgrounds push lighter; on light backgrounds push darker
  const [h, s, l] = hsl;
  const step = bgLum < 0.5 ? 1 : -1;
  let adjustedL = l;

  for (let i = 0; i < 100; i++) {
    adjustedL = Math.min(100, Math.max(0, adjustedL + step));
    const candidate = hslToHex(h, s, adjustedL);
    if (contrastRatio(getLuminance(candidate), bgLum) >= minRatio) return candidate;
    if (adjustedL === 0 || adjustedL === 100) break;
  }

  return hslToHex(h, s, adjustedL);
}

/**
 * Ensure hex color has # prefix and is 6-char format (strips alpha if 8-char)
 */
export function normalizeHexColor(color: string): string {
  if (!color || typeof color !== 'string') return '#000000';

  let hex = color.startsWith('#') ? color.substring(1) : color;

  // Strip alpha from 8-char RGBA
  if (hex.length === 8) {
    hex = hex.substring(0, 6);
  }

  // Expand 3-char shorthand
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  return `#${hex.toUpperCase()}`;
}
