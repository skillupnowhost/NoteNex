import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import PageFooter from '../components/PageFooter';
import { useTheme } from '../lib/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Home'>;

const { width } = Dimensions.get('window');

const FEATURES = [
  { icon: 'book-outline' as const, title: 'Smart Notes', desc: 'Organize and access all course materials.', color: '#1b4d8d' },
  { icon: 'document-text-outline' as const, title: 'Assignments', desc: 'Track deadlines and submissions easily.', color: '#16a34a' },
  { icon: 'layers-outline' as const, title: 'Projects', desc: 'Collaborate on group work in real time.', color: '#7c3aed' },
  { icon: 'calendar-outline' as const, title: 'Schedule', desc: 'Live countdown timers for every deadline.', color: '#d97706' },
];

function FeatureCard({ icon, title, desc, color, delay, colors }: (typeof FEATURES)[0] & { delay: number; colors: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 480, delay, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 480, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: anim, transform: [{ translateY: slideY }] }]}>
      <View style={[styles.featureIcon, { backgroundColor: `${color}14` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.featureBody}>
        <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{desc}</Text>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const heroScale = useRef(new Animated.Value(0.88)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heroScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(heroOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {/* Fixed Header */}
      <Animated.View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.headerBorder, opacity: headerOpacity }]}>
        <View style={styles.headerRight}>
          <Pressable style={[styles.signInBtn, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate('Login')}>
            <Ionicons name="person-outline" size={14} color="#ffffff" />
            <Text style={styles.signInText}>Sign In</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Body */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Animated.View style={[styles.hero, { opacity: heroOpacity, transform: [{ scale: heroScale }] }]}>
          <Image
            source={isDark ? require('../../assets/icon-dark.png') : require('../../assets/icon.png')}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <Text style={[styles.heroTagline, { color: colors.accent }]}>Share. Learn. Succeed.</Text>
          <Text style={[styles.heroDesc, { color: colors.textMuted }]}>
            Your campus workspace for notes, assignments, projects, and room-based learning.
          </Text>
        </Animated.View>

        {/* Get Started */}
        <View style={styles.btnRow}>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              style={[styles.getStartedBtn, { backgroundColor: colors.accent }]}
              onPress={() => navigation.navigate('Login')}
              onPressIn={() => Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </Pressable>
          </Animated.View>
        </View>

        {/* Features */}
        <Text style={[styles.featuresHeading, { color: colors.text }]}>Everything you need</Text>
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} {...f} delay={i * 100 + 200} colors={colors} />
        ))}

        <View style={{ height: 12 }} />
      </ScrollView>

      <PageFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  signInText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 16 },
  hero: { alignItems: 'center', marginBottom: 28 },
  heroLogo: { width: 180, height: 256, marginBottom: 8 },
  heroTagline: { fontSize: 13, marginTop: 6, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700' },
  heroDesc: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 12, maxWidth: 300 },
  btnRow: { alignItems: 'center', marginBottom: 32 },
  getStartedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 36,
    borderRadius: 50,
  },
  getStartedText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  featuresHeading: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  featureIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  featureBody: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  featureDesc: { fontSize: 12, lineHeight: 17 },
});
