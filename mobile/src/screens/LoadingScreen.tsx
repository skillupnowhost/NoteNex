import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

const { width: W } = Dimensions.get('window');

// ─── Spinning arc ring ────────────────────────────────────────────────────────

function SpinRing({ size, color, duration, opacity }: { size: number; color: string; duration: number; opacity: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration, useNativeDriver: true })
    ).start();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const r = size / 2;
  return (
    <Animated.View style={[{
      position: 'absolute', width: size, height: size,
      borderRadius: r, borderWidth: 2,
      borderColor: 'transparent',
      borderTopColor: color,
      borderRightColor: `${color}30`,
      opacity,
      transform: [{ rotate }],
    }]} />
  );
}

// ─── Dot wave ─────────────────────────────────────────────────────────────────

function DotWave({ color }: { color: string }) {
  const dotsRef = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0)));
  const dots = dotsRef.current;

  useEffect(() => {
    dots.forEach((d, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 100),
          Animated.timing(d, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.delay(500 - i * 100),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={styles.dotWave}>
      {dots.map((d, i) => {
        const scale = d.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.3] });
        const op    = d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
        return (
          <Animated.View
            key={i}
            style={[styles.waveDot, { backgroundColor: color, opacity: op, transform: [{ scale }] }]}
          />
        );
      })}
    </View>
  );
}

// ─── Hex monogram ─────────────────────────────────────────────────────────────

function CenterLogo({ accent, isDark }: { accent: string; isDark: boolean }) {
  const pop = useRef(new Animated.Value(0.5)).current;
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.06, duration: 1100, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.logoWrap, { transform: [{ scale: Animated.multiply(pop, breathe) }] }]}>
      <Animated.View style={[styles.logoGlow, { borderColor: accent }]} />
      <Image
        source={isDark ? require('../../assets/icon-dark.png') : require('../../assets/icon-light.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LoadingScreen() {
  const { isDark } = useTheme();

  const BG      = isDark ? '#03070f' : '#f4f8ff';
  const ACCENT  = isDark ? '#3b82f6' : '#1b4d8d';
  const TEXT    = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.38)';
  const SUBTLE  = isDark ? 'rgba(59,130,246,0.10)' : 'rgba(27,77,141,0.06)';

  const fadeIn = useRef(new Animated.Value(0)).current;
  const textY  = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(textY, { toValue: 0, friction: 7, delay: 260, useNativeDriver: true } as any),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { backgroundColor: BG, opacity: fadeIn }]}>
      {/* Background subtle circles */}
      <View style={[styles.bgCircle1, { backgroundColor: SUBTLE }]} />
      <View style={[styles.bgCircle2, { backgroundColor: SUBTLE }]} />

      {/* Spinning arcs */}
      <SpinRing size={140} color={ACCENT} duration={1800} opacity={0.5} />
      <SpinRing size={110} color={ACCENT} duration={1200} opacity={0.3} />

      {/* Center logo */}
      <CenterLogo accent={ACCENT} isDark={isDark} />

      {/* Label */}
      <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: textY }], alignItems: 'center', marginTop: 48 }}>
        <Text style={[styles.label, { color: TEXT }]}>Setting up your workspace</Text>
        <DotWave color={ACCENT} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  bgCircle1: {
    position: 'absolute', width: W * 1.2, height: W * 1.2,
    borderRadius: W * 0.6, top: -W * 0.3,
  },
  bgCircle2: {
    position: 'absolute', width: W * 0.9, height: W * 0.9,
    borderRadius: W * 0.45, bottom: -W * 0.25,
  },
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  logoGlow: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    borderWidth: 1, opacity: 0.4,
  },
  logoImage: { width: 90, height: 90 },
  label: { fontSize: 13, letterSpacing: 0.5, marginBottom: 20 },
  dotWave: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  waveDot: { width: 7, height: 7, borderRadius: 3.5 },
});
