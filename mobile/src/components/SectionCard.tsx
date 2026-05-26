import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeContext';

interface SectionCardProps {
  title: string;
  subtitle: string;
  caption?: string;
  icon?: string;
  iconColor?: string;
  delay?: number;
}

export default function SectionCard({ title, subtitle, caption, icon, iconColor, delay = 0 }: SectionCardProps) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  const color = iconColor || colors.accent;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: anim, transform: [{ translateY: slide }] }]}>
      <View style={styles.row}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: `${color}14` }]}>
            <Ionicons name={icon as any} size={19} color={color} />
          </View>
        )}
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          {caption ? <Text style={[styles.caption, { color: colors.textSubtle }]}>{caption}</Text> : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    marginVertical: 6,
    marginHorizontal: 20,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  iconWrap: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  caption: { marginTop: 7, fontSize: 11 },
});
