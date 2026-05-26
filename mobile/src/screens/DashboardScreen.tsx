import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { fetchAssignments, fetchMaterials, fetchProjects } from '../lib/queries';
import { useEntrance, useIconPop, usePressAnim, useCountUp } from '../lib/animations';

function getDisplayName(email: string) {
  return email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, delay }: { label: string; value: number; icon: string; color: string; delay: number }) {
  const { colors } = useTheme();
  const entrance = useEntrance(delay, 22);
  const iconPop = useIconPop(delay + 120);
  const press = usePressAnim(0.94);
  const countStr = useCountUp(value, delay + 80);

  return (
    <Animated.View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }, entrance.style]}>
      <Pressable
        style={{ alignItems: 'center', flex: 1 }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
      >
        <Animated.View style={{ transform: [{ scale: press.scale }], alignItems: 'center' }}>
          <Animated.View style={[styles.statIcon, { backgroundColor: `${color}14`, transform: [{ scale: iconPop }] }]}>
            <Ionicons name={icon as any} size={20} color={color} />
          </Animated.View>
          <Animated.Text style={[styles.statValue, { color }]}>{countStr}</Animated.Text>
          <Text style={[styles.statLabel, { color: colors.textSubtle }]}>{label}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Quick Button ─────────────────────────────────────────────────────────────

function QuickBtn({ icon, label, color, delay, onPress }: { icon: string; label: string; color: string; delay: number; onPress: () => void }) {
  const { colors } = useTheme();
  const entrance = useEntrance(delay, 16);
  const press = usePressAnim(0.88);
  const iconPop = useIconPop(delay + 100);

  return (
    <Animated.View style={[{ flex: 1 }, entrance.style]}>
      <Pressable
        style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: `${color}30` }]}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
      >
        <Animated.View style={{ transform: [{ scale: press.scale }], alignItems: 'center' }}>
          <Animated.View style={[styles.quickIcon, { backgroundColor: `${color}18`, transform: [{ scale: iconPop }] }]}>
            <Ionicons name={icon as any} size={22} color={color} />
          </Animated.View>
          <Text style={[styles.quickLabel, { color: colors.textMuted }]}>{label}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [materials, setMaterials] = useState(0);
  const [assignments, setAssignments] = useState(0);
  const [projects, setProjects] = useState(0);

  const bannerEntrance = useEntrance(0, 16);
  const infoEntrance = useEntrance(560, 20);
  const sectionOneEntrance = useEntrance(60, 14);
  const sectionTwoEntrance = useEntrance(280, 14);

  // Banner left border pulse
  const borderPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(borderPulse, { toValue: 0.55, duration: 1400, useNativeDriver: true }),
        Animated.timing(borderPulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (!user) return;
    const u = user;
    Promise.all([
      fetchMaterials(u.institution, u.department, u.year),
      fetchAssignments(u.institution, u.department, u.year),
      fetchProjects(u.institution, u.department, u.year),
    ]).then(([m, a, p]) => {
      setMaterials(m.length);
      setAssignments(a.length);
      setProjects(p.length);
    }).catch(() => {});
  }, [user]);

  if (!user) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Banner */}
      <Animated.View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border }, bannerEntrance.style]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>{greeting} 👋</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{user.studentName || getDisplayName(user.email)}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="school-outline" size={12} color={colors.accent} />
            <Text style={[styles.meta, { color: colors.accent }]}>{user.department}  ·  {user.year}</Text>
          </View>
        </View>
        <Animated.View style={[styles.roleBadge, { backgroundColor: colors.accentBg, borderColor: colors.accent, opacity: borderPulse }]}>
          <Text style={[styles.roleText, { color: colors.accent }]}>{user.role}</Text>
        </Animated.View>
      </Animated.View>

      <Animated.Text style={[styles.sectionTitle, { color: colors.textSubtle }, sectionOneEntrance.style]}>Overview</Animated.Text>
      <View style={styles.statsRow}>
        <StatCard label="Materials" value={materials} icon="book" color={colors.accent} delay={80} />
        <StatCard label="Assignments" value={assignments} icon="document-text" color={colors.amber} delay={160} />
        <StatCard label="Projects" value={projects} icon="layers" color={colors.purple} delay={240} />
      </View>

      <Animated.Text style={[styles.sectionTitle, { color: colors.textSubtle }, sectionTwoEntrance.style]}>Quick access</Animated.Text>
      <View style={styles.quickRow}>
        <QuickBtn icon="book-outline" label="Materials" color={colors.accent} delay={300} onPress={() => navigation.navigate('Materials')} />
        <QuickBtn icon="calendar-outline" label="Calendar" color={colors.amber} delay={380} onPress={() => navigation.navigate('Calendar')} />
        <QuickBtn icon="people-outline" label="Groups" color={colors.green} delay={460} onPress={() => navigation.navigate('Groups')} />
        <QuickBtn icon="layers-outline" label="Projects" color={colors.purple} delay={540} onPress={() => navigation.navigate('Projects')} />
      </View>

      <Animated.View style={[styles.infoCard, { backgroundColor: colors.accentBg, borderColor: colors.border }, infoEntrance.style]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Showing data for{' '}
          <Text style={[styles.infoStrong, { color: colors.text }]}>{user.department}</Text>
          {' '}— {user.year}
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 32, paddingHorizontal: 20 },
  banner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderRadius: 18, padding: 16, marginBottom: 22, borderWidth: 1,
  },
  greeting: { fontSize: 13, marginBottom: 4 },
  userName: { fontSize: 20, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  meta: { fontSize: 12, fontWeight: '600' },
  roleBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  roleText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1 },
  statIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 3, fontWeight: '600' },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  quickBtn: { borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1 },
  quickIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  quickLabel: { fontSize: 10, fontWeight: '600' },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 14, borderWidth: 1 },
  infoText: { fontSize: 13, flex: 1, lineHeight: 19 },
  infoStrong: { fontWeight: '700' },
});
