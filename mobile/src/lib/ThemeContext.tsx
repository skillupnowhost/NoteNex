import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'notenex_theme';

export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  card: string;
  cardElevated: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentBg: string;
  green: string;
  greenBg: string;
  red: string;
  amber: string;
  purple: string;
  header: string;
  headerBorder: string;
  tabBar: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;
  tabActiveBg: string;
  inputBg: string;
  inputBorder: string;
  statusBar: 'light' | 'dark';
  isDark: boolean;
  shadow: string;
  shadowOpacity: number;
}

export const LIGHT: ThemeColors = {
  bg: '#ffffff',
  bgSecondary: '#f8fafc',
  card: '#f1f5f9',
  cardElevated: '#ffffff',
  text: '#0f172a',
  textMuted: '#475569',
  textSubtle: '#94a3b8',
  border: 'rgba(15, 23, 42, 0.1)',
  borderStrong: 'rgba(15, 23, 42, 0.2)',
  accent: '#1b4d8d',
  accentBg: 'rgba(27, 77, 141, 0.08)',
  green: '#16a34a',
  greenBg: 'rgba(22, 163, 74, 0.1)',
  red: '#dc2626',
  amber: '#d97706',
  purple: '#7c3aed',
  header: '#ffffff',
  headerBorder: 'rgba(15, 23, 42, 0.1)',
  tabBar: '#ffffff',
  tabBarBorder: 'rgba(15, 23, 42, 0.08)',
  tabActive: '#1b4d8d',
  tabInactive: '#94a3b8',
  tabActiveBg: 'rgba(27, 77, 141, 0.08)',
  inputBg: '#f1f5f9',
  inputBorder: 'rgba(15, 23, 42, 0.12)',
  statusBar: 'dark',
  isDark: false,
  shadow: '#000000',
  shadowOpacity: 0.06,
};

export const DARK: ThemeColors = {
  bg: '#000000',
  bgSecondary: '#0d0d0d',
  card: '#111111',
  cardElevated: '#1a1a1a',
  text: '#f9fafb',
  textMuted: '#9ca3af',
  textSubtle: '#6b7280',
  border: 'rgba(255, 255, 255, 0.1)',
  borderStrong: 'rgba(255, 255, 255, 0.18)',
  accent: '#3b82f6',
  accentBg: 'rgba(59, 130, 246, 0.1)',
  green: '#22c55e',
  greenBg: 'rgba(34, 197, 94, 0.1)',
  red: '#ef4444',
  amber: '#f59e0b',
  purple: '#818cf8',
  header: '#000000',
  headerBorder: 'rgba(255, 255, 255, 0.08)',
  tabBar: '#000000',
  tabBarBorder: 'rgba(255, 255, 255, 0.08)',
  tabActive: '#3b82f6',
  tabInactive: '#6b7280',
  tabActiveBg: 'rgba(59, 130, 246, 0.1)',
  inputBg: '#1a1a1a',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  statusBar: 'light',
  isDark: true,
  shadow: '#000000',
  shadowOpacity: 0.4,
};

interface ThemeContextProps {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  colors: LIGHT,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      if (saved === 'dark') setIsDark(true);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const colors = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);

  const value = useMemo(() => ({ colors, isDark, toggleTheme }), [colors, isDark, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
