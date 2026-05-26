import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { fetchProjects } from '../lib/queries';
import { ProjectItem } from '../types';

function ProjectCard({ item, delay }: { item: ProjectItem; delay: number }) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const daysLeft = Math.ceil((new Date(item.deadline).getTime() - Date.now()) / 86_400_000);
  const statusColor = item.status === 'completed' ? colors.green : item.status === 'active' ? colors.accent : colors.textSubtle;
  const statusLabel = { planned: 'Planned', active: 'Active', completed: 'Done' }[item.status];
  const statusIcon = { planned: 'time-outline', active: 'flash-outline', completed: 'checkmark-circle-outline' }[item.status];
  const progress = item.status === 'completed' ? 1 : item.status === 'active' ? 0.6 : 0.15;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: anim, transform: [{ translateY: slide }] }]}>
      <View style={styles.cardTop}>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}14` }]}>
          <Ionicons name={statusIcon as any} size={12} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <Text style={[styles.deadline, { color: daysLeft < 0 ? colors.red : colors.textSubtle }]}>
          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
        </Text>
      </View>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
      {item.summary ? <Text style={[styles.cardSummary, { color: colors.textMuted }]} numberOfLines={2}>{item.summary}</Text> : null}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: statusColor }]} />
      </View>
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={12} color={colors.textSubtle} />
        <Text style={[styles.dateText, { color: colors.textSubtle }]}>{new Date(item.deadline).toDateString()}</Text>
      </View>
    </Animated.View>
  );
}

export default function ProjectsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!user) return;
    const u = user;
    fetchProjects(u.institution, u.department, u.year).then(r => { setProjects(r); setLoading(false); });
  }, [user]);

  if (!user) return null;

  const active = projects.filter(p => p.status === 'active').length;
  const done = projects.filter(p => p.status === 'completed').length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.pageHeader, { opacity: headerAnim }]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Projects</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Team progress and milestones</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.miniStat}><Text style={[styles.miniVal, { color: colors.green }]}>{active}</Text><Text style={[styles.miniLabel, { color: colors.textSubtle }]}>Active</Text></View>
          <View style={styles.miniStat}><Text style={[styles.miniVal, { color: colors.accent }]}>{done}</Text><Text style={[styles.miniLabel, { color: colors.textSubtle }]}>Done</Text></View>
        </View>
      </Animated.View>

      {loading ? (
        <View style={styles.empty}><Ionicons name="hourglass-outline" size={32} color={colors.textSubtle} /><Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading…</Text></View>
      ) : projects.length ? (
        projects.map((p, i) => <ProjectCard key={p.id} item={p} delay={i * 70} />)
      ) : (
        <View style={styles.empty}>
          <Ionicons name="layers-outline" size={48} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No projects yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSubtle }]}>No group projects for your department.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 32, paddingHorizontal: 20 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  pageTitle: { fontSize: 26, fontWeight: '800' },
  pageSubtitle: { fontSize: 13, marginTop: 3 },
  stats: { flexDirection: 'row', gap: 14 },
  miniStat: { alignItems: 'center' },
  miniVal: { fontSize: 20, fontWeight: '800' },
  miniLabel: { fontSize: 10, fontWeight: '600' },
  card: { borderRadius: 18, padding: 15, marginBottom: 11, borderWidth: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  deadline: { fontSize: 12, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 5 },
  cardSummary: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 56, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
