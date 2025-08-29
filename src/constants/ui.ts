/**
 * UI constants for consistent design system
 */

// Color palette for stat cards and icons
export const STAT_CARD_COLORS = {
  BLUE: 'bg-blue-500',
  PURPLE: 'bg-purple-500', 
  GREEN: 'bg-green-500',
  GRAY: 'bg-gray-500',
  RED: 'bg-red-500',
  YELLOW: 'bg-yellow-500',
} as const;

// Common spacing and sizing
export const SPACING = {
  XS: '0.5rem',
  SM: '1rem', 
  MD: '1.5rem',
  LG: '2rem',
  XL: '3rem',
} as const;

export const BORDER_RADIUS = {
  SM: 'rounded',
  MD: 'rounded-md', 
  LG: 'rounded-lg',
  FULL: 'rounded-full',
} as const;

// Animation durations
export const TRANSITIONS = {
  FAST: 'duration-150',
  NORMAL: 'duration-200', 
  SLOW: 'duration-300',
} as const;