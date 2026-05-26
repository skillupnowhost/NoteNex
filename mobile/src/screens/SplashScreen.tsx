import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, View } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const BG       = '#03070f';
const ACCENT   = '#3b82f6';
const ACCENT2  = '#6366f1';
const RING1    = 'rgba(59,130,246,0.22)';

// ─── Grid Background ─────────────────────────────────────────────────────────

function GridBg() {
  const COLS = 8;
  const ROWS = 14;
  const cellW = W / COLS;
  const cellH = H / ROWS;
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* vertical lines */}
      {Array.from({ length: COLS + 1 }).map((_, i) => (
        <View key={`v${i}`} style={[styles.gridLineV, { left: i * cellW }]} />
      ))}
      {/* horizontal lines */}
      {Array.from({ length: ROWS + 1 }).map((_, i) => (
        <View key={`h${i}`} style={[styles.gridLineH, { top: i * cellH }]} />
      ))}
    </View>
  );
}

// ─── Pulse Ring ───────────────────────────────────────────────────────────────

function PulseRing({ size, delay, color }: { size: number; delay: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.7] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.8, 0.35, 0] });
  return (
    <Animated.View style={{
      position: 'absolute', width: size, height: size, borderRadius: size / 2,
      borderWidth: 1, borderColor: color, opacity, transform: [{ scale }],
    }} />
  );
}

// ─── Floating Dot ─────────────────────────────────────────────────────────────

function FloatDot({ x, y, delay }: { x: number; y: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: -8, duration: 2400 + delay * 0.3, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 8, duration: 2400 + delay * 0.3, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });
  return (
    <Animated.View style={[styles.floatDot, { left: x, top: y, opacity, transform: [{ translateY: drift }] }]} />
  );
}

// ─── Letter Reveal ────────────────────────────────────────────────────────────

const LETTERS = 'NoteNex'.split('');

function LetterReveal({ delay }: { delay: number }) {
  const anims = useRef(LETTERS.map(() => ({
    y: new Animated.Value(18),
    op: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    LETTERS.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(anims[i].op, { toValue: 1, duration: 300, delay: delay + i * 55, useNativeDriver: true }),
        Animated.spring(anims[i].y, { toValue: 0, friction: 7, tension: 90, delay: delay + i * 55, useNativeDriver: true } as any),
      ]).start();
    });
  }, []);

  return (
    <View style={styles.letterRow}>
      {LETTERS.map((ch, i) => {
        const isUpper = ch === ch.toUpperCase() && ch !== ch.toLowerCase();
        return (
          <Animated.Text
            key={i}
            style={[
              styles.brandLetter,
              { opacity: anims[i].op, transform: [{ translateY: anims[i].y }] },
              isUpper && styles.brandLetterAccent,
            ]}
          >
            {ch}
          </Animated.Text>
        );
      })}
    </View>
  );
}

// ─── Icon Shield ──────────────────────────────────────────────────────────────

function LogoShield({ scaleAnim, opacityAnim }: { scaleAnim: Animated.Value; opacityAnim: Animated.Value }) {
  const innerRotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(innerRotate, { toValue: 1, duration: 12000, useNativeDriver: true })
    ).start();
  }, []);
  const rotate = innerRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[styles.logoZone, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <PulseRing size={180} delay={0} color={ACCENT} />
      <PulseRing size={240} delay={700} color={ACCENT2} />
      <PulseRing size={300} delay={1400} color={ACCENT} />

      {/* Outer ring (static) */}
      <View style={styles.outerRing} />

      {/* Rotating dashed ring */}
      <Animated.View style={[styles.dashRing, { transform: [{ rotate }] }]}>
        {Array.from({ length: 12 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dashSegment,
              { transform: [{ rotate: `${i * 30}deg` }, { translateY: -88 }] },
            ]}
          />
        ))}
      </Animated.View>

      {/* NoteNex logo */}
      <Image
        source={require('../../assets/icon-dark.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale  = useRef(new Animated.Value(1)).current;

  const logoScale   = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;
  const barWidth    = useRef(new Animated.Value(0)).current;
  const bottomOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true } as any),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    // Tagline
    Animated.sequence([
      Animated.delay(700),
      Animated.timing(tagOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Bottom label
    Animated.sequence([
      Animated.delay(900),
      Animated.timing(bottomOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Progress bar — 2600ms total
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(barWidth, { toValue: 1, duration: 2400, useNativeDriver: false }),
    ]).start();

    // Exit
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(exitOpacity, { toValue: 0, duration: 420, useNativeDriver: true }),
        Animated.timing(exitScale, { toValue: 1.05, duration: 420, useNativeDriver: true }),
      ]).start(() => onFinish());
    }, 2900);
    return () => clearTimeout(t);
  }, []);

  const barInterp = barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity, transform: [{ scale: exitScale }] }]}>
      <GridBg />

      {/* Ambient radial glow */}
      <Animated.View style={[styles.ambientGlow, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.ambientGlow2, { opacity: glowOpacity }]} />

      {/* Floating particles */}
      <FloatDot x={W * 0.12} y={H * 0.15} delay={200} />
      <FloatDot x={W * 0.82} y={H * 0.22} delay={600} />
      <FloatDot x={W * 0.08} y={H * 0.72} delay={400} />
      <FloatDot x={W * 0.88} y={H * 0.65} delay={800} />
      <FloatDot x={W * 0.5} y={H * 0.88} delay={300} />
      <FloatDot x={W * 0.25} y={H * 0.42} delay={1000} />
      <FloatDot x={W * 0.72} y={H * 0.48} delay={500} />

      {/* Logo orb */}
      <LogoShield scaleAnim={logoScale} opacityAnim={logoOpacity} />

      {/* Brand name — letter by letter */}
      <LetterReveal delay={380} />

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
        YOUR CAMPUS WORKSPACE
      </Animated.Text>

      {/* Divider line */}
      <Animated.View style={[styles.divider, { opacity: tagOpacity }]} />

      {/* Bottom label */}
      <Animated.Text style={[styles.bottomLabel, { opacity: bottomOpacity }]}>
        SkillUpNow · 2026
      </Animated.Text>

      {/* Glowing progress bar */}
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barInterp }]} />
        <Animated.View style={[styles.barGlow, { width: barInterp }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },

  // Grid
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(59,130,246,0.055)' },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(59,130,246,0.055)' },

  // Ambient glows
  ambientGlow: {
    position: 'absolute', width: 340, height: 340,
    borderRadius: 170, top: '18%',
    backgroundColor: 'rgba(59,130,246,0.07)',
  },
  ambientGlow2: {
    position: 'absolute', width: 200, height: 200,
    borderRadius: 100, top: '16%',
    backgroundColor: 'rgba(99,102,241,0.06)',
  },

  // Floating dots
  floatDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: ACCENT },

  // Logo zone
  logoZone: {
    width: 200, height: 200,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 36,
  },
  outerRing: {
    position: 'absolute', width: 164, height: 164, borderRadius: 82,
    borderWidth: 1, borderColor: RING1,
  },
  dashRing: {
    position: 'absolute', width: 180, height: 180,
    alignItems: 'center', justifyContent: 'center',
  },
  dashSegment: {
    position: 'absolute', width: 3, height: 10,
    borderRadius: 2, backgroundColor: 'rgba(59,130,246,0.35)',
  },
  logoImage: { width: 110, height: 110 },

  // Brand text
  letterRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  brandLetter: { fontSize: 42, fontWeight: '800', color: '#ffffff', letterSpacing: 2 },
  brandLetterAccent: { color: ACCENT },

  // Tagline
  tagline: {
    fontSize: 10, color: 'rgba(255,255,255,0.35)',
    letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 18,
  },
  divider: {
    width: 40, height: 1,
    backgroundColor: 'rgba(59,130,246,0.4)',
    marginBottom: 0,
  },

  // Bottom label
  bottomLabel: {
    position: 'absolute', bottom: 22,
    fontSize: 10, color: 'rgba(255,255,255,0.18)',
    letterSpacing: 2, textTransform: 'uppercase',
  },

  // Progress bar
  barTrack: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 3, backgroundColor: 'rgba(59,130,246,0.10)',
  },
  barFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: ACCENT,
    borderTopRightRadius: 2, borderBottomRightRadius: 2,
  },
  barGlow: {
    position: 'absolute', left: 0, top: -3, bottom: -3,
    backgroundColor: 'rgba(59,130,246,0.35)',
    borderTopRightRadius: 4, borderBottomRightRadius: 4,
  },
});
