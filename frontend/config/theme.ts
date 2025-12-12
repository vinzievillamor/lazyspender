import { MD3LightTheme, MD3Theme } from 'react-native-paper';

/**
 * Custom theme based on modern borderless UI design
 * Inspired by clean, card-based layouts with soft shadows and pastel colors
 */
export const customTheme: MD3Theme = {
  ...MD3LightTheme,

  // Remove roundness for a more modern look, or use consistent radius
  roundness: 16,

  colors: {
    ...MD3LightTheme.colors,

    // Primary colors - Soft blue accent
    primary: '#6B9FFF',
    onPrimary: '#FFFFFF',
    primaryContainer: '#E8F1FF',
    onPrimaryContainer: '#1A3A6B',

    // Secondary colors - Muted purple/gray
    secondary: '#8B89A8',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E8E7F2',
    onSecondaryContainer: '#2A2838',

    // Tertiary colors - Success green for income
    tertiary: '#4CAF50',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#E8F5E9',
    onTertiaryContainer: '#1B5E20',

    // Error colors - For expenses and warnings
    error: '#FF6B6B',
    onError: '#FFFFFF',
    errorContainer: '#FFEBEE',
    onErrorContainer: '#C62828',

    // Background colors - Light and clean
    background: '#F5F7FA',
    onBackground: '#1A1C1E',

    // Surface colors - White cards with subtle elevation
    surface: '#FFFFFF',
    onSurface: '#1A1C1E',
    surfaceVariant: '#F8F9FA',
    onSurfaceVariant: '#42474E',
    surfaceDisabled: 'rgba(26, 28, 30, 0.12)',
    onSurfaceDisabled: 'rgba(26, 28, 30, 0.38)',

    // Outline - Minimal or no borders
    outline: 'transparent',
    outlineVariant: 'rgba(0, 0, 0, 0.05)',

    // Inverse colors
    inverseSurface: '#2F3033',
    inverseOnSurface: '#F1F0F4',
    inversePrimary: '#A8C7FF',

    // Shadow/Elevation
    shadow: 'rgba(0, 0, 0, 0.08)',
    scrim: 'rgba(0, 0, 0, 0.5)',

    // Backdrop
    backdrop: 'rgba(0, 0, 0, 0.4)',

    // Custom semantic colors
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#FFFFFF',
      level3: '#FFFFFF',
      level4: '#FFFFFF',
      level5: '#FFFFFF',
    },
  },
};

/**
 * Custom color palette for categories and UI elements
 */
export const customColors = {
  // Status indicators
  income: '#4CAF50',
  expense: '#FF6B6B',
  pending: '#FFA726',
  completed: '#66BB6A',

  // Category icon backgrounds (soft pastel colors)
  iconBackgrounds: {
    blue: '#E8F1FF',
    purple: '#F3E8FF',
    green: '#E8F5E9',
    orange: '#FFF4E8',
    pink: '#FFE8F0',
    teal: '#E0F7FA',
    yellow: '#FFF9E8',
    gray: '#F0F0F0',
  },

  // Category icon foregrounds
  iconForegrounds: {
    blue: '#6B9FFF',
    purple: '#9C6FFF',
    green: '#4CAF50',
    orange: '#FF9F43',
    pink: '#FF6B9D',
    teal: '#26C6DA',
    yellow: '#FFC107',
    gray: '#757575',
  },

  // Chart colors
  charts: {
    primary: '#6B9FFF',
    secondary: '#9C6FFF',
    tertiary: '#4CAF50',
    quaternary: '#FF9F43',
    quinary: '#FF6B9D',
  },

  // Text colors
  text: {
    primary: '#1A1C1E',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    disabled: '#D1D5DB',
  },
};

/**
 * Shadow presets for borderless design
 */
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

/**
 * Spacing system
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

/**
 * Border radius system (for borderless design with rounded corners)
 */
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export default customTheme;
