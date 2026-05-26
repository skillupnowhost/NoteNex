import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/ThemeContext';

export default function PageFooter() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.footer, { backgroundColor: colors.header, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.divider, { backgroundColor: colors.accent }]} />
      <Text style={[styles.text, { color: colors.textSubtle }]}>
        <Text style={[styles.brand, { color: colors.textMuted }]}>NoteNex 2026</Text>
        {'  ·  '}
        <Text style={[styles.company, { color: colors.textSubtle }]}>SkillUpNow</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingTop: 12,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  divider: {
    width: 32,
    height: 2,
    borderRadius: 2,
    marginBottom: 8,
    opacity: 0.4,
  },
  text: { fontSize: 12, letterSpacing: 0.3 },
  brand: { fontWeight: '700' },
  company: {},
});
