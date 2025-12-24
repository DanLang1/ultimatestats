/**
 * Color utility functions for team color management
 */

/**
 * Common team colors for the preset picker
 */
export const TEAM_COLOR_PRESETS = [
  // Light colors (will have dark text)
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Gold', hex: '#FFD700' },
  { name: 'Yellow', hex: '#FFEB3B' },
  { name: 'Lime', hex: '#8BC34A' },
  { name: 'Sky', hex: '#87CEEB' },

  // Dark colors (will have light text)
  { name: 'Black', hex: '#1A1A1A' },
  { name: 'Navy', hex: '#0F172A' },
  { name: 'Blue', hex: '#1E40AF' },
  { name: 'Red', hex: '#B91C1C' },
  { name: 'Green', hex: '#15803D' },
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Maroon', hex: '#7F1D1D' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Pink', hex: '#DB2777' },
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
 * Validate if a string is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
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
