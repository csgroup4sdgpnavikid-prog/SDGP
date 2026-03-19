import { Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// iPhone 14/15 standard baseline (390px logical width)
const BASE_W = 390;

/**
 * Full proportional scale relative to screen width.
 * Use for layout dimensions (widths, heights) that should scale linearly.
 */
export const scale = (size: number): number =>
  Math.round((SCREEN_W / BASE_W) * size);

/**
 * Moderate scale — dampens extremes so fonts/padding don't grow too large on tablets.
 * factor 0.5 = halfway between fixed size and fully scaled size.
 * Use for: font sizes, padding, margin, border radius, input heights.
 */
export const moderateScale = (size: number, factor = 0.5): number =>
  Math.round(size + (scale(size) - size) * factor);

/** Percentage of screen width (0–100). */
export const wp = (pct: number): number => Math.round((SCREEN_W * pct) / 100);

/** Percentage of screen height (0–100). */
export const hp = (pct: number): number => Math.round((SCREEN_H * pct) / 100);

/** True when running on a tablet (logical width ≥ 768px). */
export const isTablet = SCREEN_W >= 768;

/**
 * Max content width for form screens on tablets.
 * Centres content so it doesn't stretch across the full 768px+ width.
 */
export const CONTENT_MAX_WIDTH = isTablet ? 560 : undefined;
