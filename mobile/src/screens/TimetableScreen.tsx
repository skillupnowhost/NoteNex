import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { fetchAssignments } from '../lib/queries';
import { AssignmentItem } from '../types';

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatCd(ms: number) {
  if (ms <= 0) return { d: '00', h: '00', m: '00', s: '00' };
  const sec = Math.floor(ms / 1000);
  return { d: pad(Math.floor(sec / 86400)), h: pad(Math.floor((sec % 86400) / 3600)), m: pad(Math.floor((sec % 3600) / 60)), s: pad(sec % 60) };
}

function CdUnit({ value, label, color }: { value: string; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.cdUnit}>
      <View style={[styles.cdBox, { backgroundColor: `${color}14`, borderColor: `${color}30` }]}>
        <Text style={[styles.cdValue, { color }]}>{value}</Text>
      </View>
      <Text style={[styles.cdLabel, { color: colors.textSubtle }]}>{label}</Text>
    </View>
  );
}

function TimelineItem({ item, index, isLast, now }: { item: AssignmentItem; index: number; isLast: boolean; now: number }) {
  const { colors } = useTheme();
  const overdue = new Date(item.dueDate).getTime() < now;
  const itemAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(itemAnim, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.timelineItem, { opacity: itemAnim }]}>
      <View style={styles.tDot}>
        <View style={[styles.dot, { backgroundColor: overdue ? colors.red : colors.accent }]} />
        {!isLast && <View style={[styles.line, { backgroundColor: colors.border }]} />}
      </View>
      <View style={[styles.tCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.tTitle, { color: colors.text }]}>{item.title}</Text>
        <View style={styles.tMeta}>
          <Ionicons name="calendar-outline" size={11} color={colors.textSubtle} />
          <Text style={[styles.tDate, { color: colors.textSubtle }]}>{new Date(item.dueDate).toLocaleString()}</Text>
          {overdue && (
            <View style={[styles.overTag, { backgroundColor: `${colors.red}14` }]}>
              <Text style={[styles.overText, { color: colors.red }]}>Overdue</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function TimetableScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [now, setNow] = useState(Date.now());
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cdAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(cdAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!user) return;
    const u = user;
    fetchAssignments(u.institution, u.department, u.year).then(setAssignments);
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const next = useMemo(() => {
    return assignments
      .map(a => ({ ...a, dueMs: new Date(a.dueDate).getTime() }))
      .filter(a => a.dueMs > now)
      .sort((a, b) => a.dueMs - b.dueMs)[0];
  }, [assignments, now]);

  if (!user) return null;

  const cd = next ? formatCd(next.dueMs - now) : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.pageHeader, { opacity: headerAnim }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Timetable</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Live deadline countdown</Text>
      </Animated.View>

      {/* Countdown */}
      <Animated.View style={[styles.cdCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: cdAnim }]}>
        {next && cd ? (
          <>
            <View style={styles.cdHeader}>
              <Ionicons name="alarm-outline" size={15} color={colors.amber} />
              <Text style={[styles.cdTitle, { color: colors.amber }]}>Next deadline</Text>
            </View>
            <Text style={[styles.nextName, { color: colors.text }]} numberOfLines={1}>{next.title}</Text>
            <View style={styles.cdRow}>
              <CdUnit value={cd.d} label="Days" color={colors.amber} />
              <Text style={[styles.cdSep, { color: colors.amber }]}>:</Text>
              <CdUnit value={cd.h} label="Hrs" color={colors.amber} />
              <Text style={[styles.cdSep, { color: colors.amber }]}>:</Text>
              <CdUnit value={cd.m} label="Min" color={colors.amber} />
              <Text style={[styles.cdSep, { color: colors.amber }]}>:</Text>
              <CdUnit value={cd.s} label="Sec" color={colors.amber} />
            </View>
          </>
        ) : (
          <View style={styles.noDeadline}>
            <Ionicons name="checkmark-circle" size={36} color={colors.green} />
            <Text style={[styles.noText, { color: colors.green }]}>No upcoming deadlines</Text>
          </View>
        )}
      </Animated.View>

      {/* Timeline */}
      {assignments.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSubtle }]}>All deadlines</Text>
          {assignments.map((a, i) => (
            <TimelineItem key={a.id} item={a} index={i} isLast={i === assignments.length - 1} now={now} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 32, paddingHorizontal: 20 },
  pageHeader: { marginBottom: 16 },
  pageTitle: { fontSize: 26, fontWeight: '800' },
  pageSubtitle: { fontSize: 13, marginTop: 3 },
  cdCard: { borderRadius: 20, padding: 18, borderWidth: 1, marginBottom: 22 },
  cdHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cdTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  nextName: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  cdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  cdUnit: { alignItems: 'center' },
  cdBox: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 52, alignItems: 'center', borderWidth: 1 },
  cdValue: { fontSize: 24, fontWeight: '800' },
  cdLabel: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  cdSep: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  noDeadline: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  noText: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  timelineItem: { flexDirection: 'row', marginBottom: 14, gap: 12 },
  tDot: { alignItems: 'center', width: 14 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  line: { flex: 1, width: 2, marginTop: 4 },
  tCard: { flex: 1, borderRadius: 13, padding: 11, borderWidth: 1 },
  tTitle: { fontSize: 13, fontWeight: '700', marginBottom: 5 },
  tMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  tDate: { fontSize: 11 },
  overTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  overText: { fontSize: 10, fontWeight: '700' },
});
