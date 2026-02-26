/**
 * App Color Theme – Fresh Blue Modern
 * Matches APP_COLOR_THEME.md and index.css :root variables.
 * Use for inline styles or JS (e.g. charts). Prefer CSS variables in stylesheets.
 */

export const colors = {
  // Brand
  primary: '#0077C0',
  primaryDark: '#005A94',
  primaryLight: '#3399D6',
  secondary: '#1D242B',
  accent: '#C7EEFF',
  cta: '#0077C0',

  // Background & surface
  background: '#FAFAFA',
  backgroundPure: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F8FA',
  surfaceCard: '#FFFFFF',
  accentLight: '#C7EEFF',
  accentLighter: '#E3F6FF',
  accentSoft: '#F0FAFF',

  // Text
  text: '#1D242B',
  textPrimary: '#1D242B',
  textSecondary: '#5A6978',
  textTertiary: '#8B97A6',
  textMuted: '#8B97A6',
  textDisabled: '#CBD5DC',
  textBlack: '#000000',
  textWhite: '#FFFFFF',

  // UI
  border: '#E1E8ED',
  borderLight: '#F0F4F8',
  borderFocus: '#0077C0',
  disabled: '#CBD5DC',

  // Status
  error: '#E53935',
  success: '#00C853',
  warning: '#FF9800',
  info: '#0077C0',
  successLight: '#E8F5E9',
  errorLight: '#FFEBEE',
  warningLight: '#FFF3E0',
  infoLight: '#E3F6FF',

  // Overlays
  overlay: 'rgba(29, 36, 43, 0.6)',
  overlayLight: 'rgba(29, 36, 43, 0.3)',
  propertyCardShadow: 'rgba(29, 36, 43, 0.08)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 24,
  round: 9999,
};

export const shadows = {
  card: {
    boxShadow: '0 2px 12px rgba(29, 36, 43, 0.08)',
  },
  cardHover: {
    boxShadow: '0 4px 16px rgba(29, 36, 43, 0.12)',
  },
  button: {
    boxShadow: '0 3px 8px rgba(0, 119, 192, 0.25)',
  },
  subtle: {
    boxShadow: '0 1px 4px rgba(29, 36, 43, 0.05)',
  },
};

export const typography = {
  h1: { fontSize: 32, fontWeight: 700, lineHeight: 40, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: 700, lineHeight: 30, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: 600, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: 400, lineHeight: 24 },
  bodyLarge: { fontSize: 18, fontWeight: 400, lineHeight: 28 },
  bodySemibold: { fontSize: 16, fontWeight: 600, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: 400, lineHeight: 20 },
  captionSemibold: { fontSize: 14, fontWeight: 600, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: 400, lineHeight: 16 },
  price: { fontSize: 20, fontWeight: 700, lineHeight: 28 },
};

export default {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
};
