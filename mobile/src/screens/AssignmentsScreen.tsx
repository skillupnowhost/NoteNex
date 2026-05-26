import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { fetchAssignments } from '../lib/queries';
import { AssignmentItem } from '../types';

function urgency(dueDate: string, colors: any): { label: string; color: string; bg: string } {
  const diff = new Date(dueDate).getTime() - Date.now();
  const days = diff / 86_400_000;
  if (diff <= 0) return { label: 'Overdue', color: colors.red, bg: `${colors.red}14` };
  if (days < 1) return { label: 'Due today', color: colors.amber, bg: `${colors.amber}14` };
  if (days < 3) return { label: `${Math.ceil(days)}d left`, color: colors.amber, bg: `${colors.amber}14` };
  return { label: `${Math.floor(days)}d left`, color: colors.green, bg: `${colors.green}14` };
}

function AssignmentCard({ item, delay }: { item: AssignmentItem; delay: number }) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const u = urgency(item.dueDate, colors);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: anim, transform: [{ translateY: slide }] }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
        <View style={[styles.badge, { backgroundColor: u.bg }]}>
          <Text style={[styles.badgeText, { color: u.color }]}>{u.label}</Text>
        </View>
      </View>
      {item.description ? <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={2}>{item.description}</Text> : null}
      <View style={styles.cardFooter}>
        <Ionicons name="calendar-outline" size={12} color={colors.textSubtle} />
        <Text style={[styles.footerText, { color: colors.textSubtle }]}>{new Date(item.dueDate).toDateString()}</Text>
        <Text style={[styles.dot, { color: colors.textSubtle }]}>·</Text>
        <Ionicons name="person-outline" size={12} color={colors.textSubtle} />
        <Text style={[styles.footerText, { color: colors.textSubtle }]}>{item.postedBy}</Text>
      </View>
    </Animated.View>
  );
}

export default function AssignmentsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!user) return;
    const u = user;
    fetchAssignments(u.institution, u.department, u.year).then(r => { setItems(r); setLoading(false); });
  }, [user]);

  if (!user) return null;

  const overdue = items.filter(a => new Date(a.dueDate).getTime() < Date.now()).length;
  const upcoming = items.length - overdue;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.pageHeader, { opacity: headerAnim }]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Assignments</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Deadlines and submissions</Text>
        </View>
        <View style={styles.badges}>
          {upcoming > 0 && <View style={[styles.chip, { backgroundColor: colors.greenBg }]}><Text style={[styles.chipText, { color: colors.green }]}>{upcoming} upcoming</Text></View>}
          {overdue > 0 && <View style={[styles.chip, { backgroundColor: `${colors.red}14` }]}><Text style={[styles.chipText, { color: colors.red }]}>{overdue} overdue</Text></View>}
        </View>
      </Animated.View>

      {loading ? (
        <View style={styles.empty}><Ionicons name="hourglass-outline" size={32} color={colors.textSubtle} /><Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading…</Text></View>
      ) : items.length ? (
        items.map((a, i) => <AssignmentCard key={a.id} item={a} delay={i * 70} />)
      ) : (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={48} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No assignments</Text>
          <Text style={[styles.emptyText, { color: colors.textSubtle }]}>Nothing due for your class yet.</Text>
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
  badges: { gap: 5, alignItems: 'flex-end' },
  chip: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { fontSize: 11, fontWeight: '700' },
  card: { borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  badge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerText: { fontSize: 12 },
  dot: { fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 56, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
