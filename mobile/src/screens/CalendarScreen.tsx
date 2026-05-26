import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, FlatList, Modal, Pressable,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import {
  CampusEvent, EventType, Semester,
  createEvent, deleteEvent, fetchEvents, getCountdown,
} from '../lib/queries';
import { useEntrance, useIconPop, usePressAnim } from '../lib/animations';
import { UserRole } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_TYPES: EventType[] = ['Exam', 'Assignment', 'Project', 'Seminar', 'Workshop', 'Holiday', 'Other'];
const SEMESTERS: Semester[] = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8', 'All'];

const EVENT_COLORS: Record<EventType, string> = {
  Exam: '#ef4444', Assignment: '#f59e0b', Project: '#8b5cf6',
  Seminar: '#3b82f6', Workshop: '#06b6d4', Holiday: '#22c55e', Other: '#94a3b8',
};

// Roles that are allowed to create events
const EVENT_CREATOR_ROLES: UserRole[] = ['admin', 'professor', 'hod', 'principal'];

function canAddEvent(role: UserRole | undefined): boolean {
  return !!role && EVENT_CREATOR_ROLES.includes(role);
}

// ─── Chip Row ─────────────────────────────────────────────────────────────────

function Chip<T extends string>({ option, selected, onSelect, colors }: { option: T; selected: T; onSelect: (v: T) => void; colors: any }) {
  const press = usePressAnim(0.9);
  return (
    <Pressable
      style={[styles.chip, { borderColor: colors.border }, selected === option && { backgroundColor: colors.accent, borderColor: colors.accent }]}
      onPress={() => onSelect(option)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.Text style={[styles.chipText, { color: selected === option ? '#fff' : colors.textMuted, transform: [{ scale: press.scale }] }]}>{option}</Animated.Text>
    </Pressable>
  );
}

function ChipRow<T extends string>({
  options, selected, onSelect, colors,
}: { options: T[]; selected: T; onSelect: (v: T) => void; colors: any }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {options.map(o => (
          <Chip key={o} option={o} selected={selected} onSelect={onSelect} colors={colors} />
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Add Event Modal ──────────────────────────────────────────────────────────

function AddEventModal({
  visible, onClose, onAdded, user, colors, prefillDate,
}: { visible: boolean; onClose: () => void; onAdded: () => void; user: any; colors: any; prefillDate?: string }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('Exam');
  const [semester, setSemester] = useState<Semester>('Sem 1');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const sheetAnim = useRef(new Animated.Value(400)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const savePress = usePressAnim(0.96);

  useEffect(() => {
    if (visible) {
      if (prefillDate) setDueDate(prefillDate);
      Animated.parallel([
        Animated.spring(sheetAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Reset form when closed
  useEffect(() => {
    if (!visible) {
      setTitle(''); setDescription('');
      setType('Exam'); setSemester('Sem 1');
    }
  }, [visible]);

  function isValidDate(s: string) {
    return /^\d{4}-\d{2}-\d{2}/.test(s) && !isNaN(new Date(s).getTime());
  }

  async function handleSave() {
    if (!title.trim()) { Alert.alert('Required', 'Please enter an event title.'); return; }
    if (!isValidDate(dueDate)) { Alert.alert('Invalid Date', 'Enter date as YYYY-MM-DD or YYYY-MM-DDTHH:MM'); return; }
    try {
      setSaving(true);
      await createEvent({
        title: title.trim(), type, description: description.trim(),
        dueDate: new Date(dueDate).toISOString(),
        institution: user.institution, department: user.department,
        semester, createdBy: user.email, tags: [type, semester],
      });
      setTitle(''); setDueDate(''); setDescription('');
      onAdded(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add event.');
    } finally { setSaving(false); }
  }

  const roleLabel: Record<UserRole, string> = {
    admin: 'Admin', professor: 'Professor', hod: 'HOD', principal: 'Principal', student: 'Student',
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: colors.cardElevated, transform: [{ translateY: sheetAnim }] }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          <View style={styles.sheetTitleRow}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Event</Text>
            {user?.role && (
              <View style={[styles.roleBadge, { backgroundColor: colors.accentBg }]}>
                <Ionicons name="shield-checkmark-outline" size={12} color={colors.accent} />
                <Text style={[styles.roleBadgeText, { color: colors.accent }]}>{roleLabel[user.role as UserRole] ?? user.role}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Title *</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Mid-term Exam" placeholderTextColor={colors.textSubtle} style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]} />

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Event Type</Text>
          <ChipRow options={EVENT_TYPES} selected={type} onSelect={setType} colors={colors} />

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Semester</Text>
          <ChipRow options={SEMESTERS} selected={semester} onSelect={setSemester} colors={colors} />

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Due Date (YYYY-MM-DD or YYYY-MM-DDTHH:MM) *</Text>
          <TextInput value={dueDate} onChangeText={setDueDate} placeholder="2026-06-15  or  2026-06-15T14:30" placeholderTextColor={colors.textSubtle} style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]} />

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Description (optional)</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Additional details…" placeholderTextColor={colors.textSubtle} multiline numberOfLines={2} style={[styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]} />

          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.accent }, saving && { opacity: 0.65 }]}
            onPress={handleSave}
            onPressIn={savePress.onPressIn}
            onPressOut={savePress.onPressOut}
            disabled={saving}
          >
            <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, { transform: [{ scale: savePress.scale }] }]}>
              {saving ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="calendar-outline" size={17} color="#fff" /><Text style={styles.saveBtnText}>Add to Calendar</Text></>}
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Date Action Sheet ────────────────────────────────────────────────────────

function DateActionSheet({
  visible, date, eventsOnDay, userRole, onClose, onAddEvent, colors,
}: {
  visible: boolean;
  date: Date | null;
  eventsOnDay: CampusEvent[];
  userRole: UserRole | undefined;
  onClose: () => void;
  onAddEvent: () => void;
  colors: any;
}) {
  const sheetAnim = useRef(new Animated.Value(500)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const addPress = usePressAnim(0.95);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(sheetAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetAnim, { toValue: 500, duration: 180, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!date) return null;

  const isSunday = date.getDay() === 0;
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const allowAdd = canAddEvent(userRole);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: colors.cardElevated, transform: [{ translateY: sheetAnim }] }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          {/* Date header */}
          <View style={[styles.dateSheetHeader, isSunday && { backgroundColor: '#ff4d4d18', borderRadius: 14, padding: 12, marginBottom: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons
                name="calendar"
                size={20}
                color={isSunday ? '#ff4d4d' : colors.accent}
              />
              <Text style={[styles.dateSheetTitle, { color: isSunday ? '#ff4d4d' : colors.text }]}>{dateStr}</Text>
            </View>
            {isSunday && (
              <View style={styles.sundayTag}>
                <Text style={styles.sundayTagText}>Sunday</Text>
              </View>
            )}
          </View>

          {/* Events on this day */}
          {eventsOnDay.length > 0 ? (
            <View style={{ marginBottom: 14 }}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 8 }]}>
                {eventsOnDay.length} Event{eventsOnDay.length > 1 ? 's' : ''} this day
              </Text>
              {eventsOnDay.slice(0, 3).map(evt => {
                const color = EVENT_COLORS[evt.type] ?? colors.accent;
                return (
                  <View key={evt.id} style={[styles.miniEventRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.miniEventBar, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.miniEventTitle, { color: colors.text }]} numberOfLines={1}>{evt.title}</Text>
                      <Text style={[styles.miniEventType, { color }]}>{evt.type} · {evt.semester}</Text>
                    </View>
                  </View>
                );
              })}
              {eventsOnDay.length > 3 && (
                <Text style={[styles.moreEvents, { color: colors.textSubtle }]}>+{eventsOnDay.length - 3} more…</Text>
              )}
            </View>
          ) : (
            <View style={[styles.noEventsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSubtle} />
              <Text style={[styles.noEventsText, { color: colors.textSubtle }]}>No events scheduled</Text>
            </View>
          )}

          {/* Add Event button — role-gated */}
          {allowAdd ? (
            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.accent }]}
              onPress={() => { onClose(); setTimeout(onAddEvent, 250); }}
              onPressIn={addPress.onPressIn}
              onPressOut={addPress.onPressOut}
            >
              <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, { transform: [{ scale: addPress.scale }] }]}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Add Event on This Day</Text>
              </Animated.View>
            </Pressable>
          ) : (
            <View style={[styles.noPermRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSubtle} />
              <Text style={[styles.noPermText, { color: colors.textSubtle }]}>Only admins, professors, HODs & principals can add events</Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event, isOwner, onDelete, index, colors }: {
  event: CampusEvent; isOwner: boolean; onDelete: (e: CampusEvent) => void; index: number; colors: any;
}) {
  const entrance = useEntrance(index * 50, 0);
  const slideX = useRef(new Animated.Value(-18)).current;
  const press = usePressAnim(0.97);
  const deletePress = usePressAnim(0.85);

  useEffect(() => {
    Animated.timing(slideX, { toValue: 0, duration: 340, delay: index * 50, useNativeDriver: true }).start();
  }, []);

  const color = EVENT_COLORS[event.type] ?? colors.accent;
  const countdown = getCountdown(event.dueDate);
  const due = new Date(event.dueDate);

  return (
    <Animated.View style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: entrance.opacity, transform: [{ translateX: slideX }] }]}>
      <Pressable style={{ flexDirection: 'row', flex: 1 }} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={[{ flexDirection: 'row', flex: 1 }, { transform: [{ scale: press.scale }] }]}>
          <View style={[styles.eventColorBar, { backgroundColor: color }]} />
          <View style={{ flex: 1 }}>
            <View style={styles.eventTopRow}>
              <View style={styles.eventMeta}>
                <View style={[styles.typeBadge, { backgroundColor: `${color}18` }]}>
                  <Text style={[styles.typeText, { color }]}>{event.type}</Text>
                </View>
                <View style={[styles.semBadge, { backgroundColor: colors.accentBg }]}>
                  <Text style={[styles.semText, { color: colors.accent }]}>{event.semester}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.countdown, { backgroundColor: countdown.overdue ? `${colors.red}18` : countdown.urgent ? `${colors.amber}18` : colors.greenBg }]}>
                  <Text style={[styles.countdownText, { color: countdown.overdue ? colors.red : countdown.urgent ? colors.amber : colors.green }]}>
                    {countdown.text}
                  </Text>
                </View>
                {isOwner && (
                  <Pressable onPress={() => onDelete(event)} onPressIn={deletePress.onPressIn} onPressOut={deletePress.onPressOut}>
                    <Animated.View style={{ transform: [{ scale: deletePress.scale }] }}>
                      <Ionicons name="trash-outline" size={15} color={colors.textSubtle} />
                    </Animated.View>
                  </Pressable>
                )}
              </View>
            </View>

            <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
            {!!event.description && (
              <Text style={[styles.eventDesc, { color: colors.textMuted }]} numberOfLines={2}>{event.description}</Text>
            )}
            <View style={styles.eventDateRow}>
              <Ionicons name="calendar-outline" size={12} color={colors.textSubtle} />
              <Text style={[styles.eventDate, { color: colors.textSubtle }]}>
                {due.toLocaleDateString()} · {due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Ionicons name="person-outline" size={12} color={colors.textSubtle} />
              <Text style={[styles.eventDate, { color: colors.textSubtle }]} numberOfLines={1}>{event.createdBy}</Text>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Calendar Cell ────────────────────────────────────────────────────────────

function CalCell({
  day, isToday, hasEvt, delay, colors, isSunday, onPress,
}: {
  day: number | null;
  isToday: boolean;
  hasEvt: boolean;
  delay: number;
  colors: any;
  isSunday: boolean;
  onPress: (day: number) => void;
}) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const press = usePressAnim(0.82);

  useEffect(() => {
    if (day === null) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 100, delay, useNativeDriver: true } as any),
      Animated.timing(opacity, { toValue: 1, duration: 220, delay, useNativeDriver: true }),
    ]).start();
  }, [day]);

  if (day === null) return <View style={styles.cell} />;

  const sundayBg = isSunday && !isToday ? 'rgba(255,77,77,0.10)' : undefined;
  const sundayTextColor = isSunday && !isToday ? '#ff4d4d' : isToday ? '#ffffff' : colors.text;

  return (
    <Pressable
      style={[styles.cell, sundayBg ? { backgroundColor: sundayBg } : null]}
      onPress={() => onPress(day)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={[
        isToday && [styles.todayCellInner, { backgroundColor: colors.accent }],
        isSunday && !isToday && styles.sundayCellInner,
        { transform: [{ scale: Animated.multiply(scale, press.scale) }], opacity, alignItems: 'center', justifyContent: 'center', width: '80%', aspectRatio: 1, borderRadius: 20 },
      ]}>
        <Text style={[styles.dayNum, { color: sundayTextColor }]}>{day}</Text>
        {hasEvt && <View style={[styles.eventDot, { backgroundColor: isToday ? '#ffffff' : isSunday ? '#ff4d4d' : colors.red }]} />}
      </Animated.View>
    </Pressable>
  );
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────

function StatBox({ label, value, color, delay, colors }: { label: string; value: number; color: string; delay: number; colors: any }) {
  const press = usePressAnim(0.94);
  const pop = useIconPop(delay + 80);
  return (
    <Pressable style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: Animated.multiply(press.scale, pop) }] }}>
        <Text style={[styles.statVal, { color }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textSubtle }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({ option, active, color, onSelect }: { option: string; active: boolean; color: string; onSelect: (v: string) => void }) {
  const press = usePressAnim(0.88);
  return (
    <Pressable
      style={[styles.filterChip, { borderColor: color }, active && { backgroundColor: color }]}
      onPress={() => onSelect(option)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.Text style={[styles.filterChipText, { color: active ? '#fff' : color, transform: [{ scale: press.scale }] }]}>{option}</Animated.Text>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [filterType, setFilterType] = useState<EventType | 'All'>('All');
  const [today] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Date action sheet state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [addModalPrefill, setAddModalPrefill] = useState<string>('');

  const headerEntrance = useEntrance(0, 16);
  const statsEntrance = useEntrance(80, 14);
  const calEntrance = useEntrance(140, 18);
  const addBtnPress = usePressAnim(0.9);
  const addBtnPop = useIconPop(120);
  const prevPress = usePressAnim(0.85);
  const nextPress = usePressAnim(0.85);

  // Month slide animation
  const monthSlide = useRef(new Animated.Value(0)).current;
  const monthOpacity = useRef(new Animated.Value(1)).current;

  function changeMonth(dir: 1 | -1) {
    Animated.parallel([
      Animated.timing(monthOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(monthSlide, { toValue: dir * -20, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setViewDate(d => new Date(d.getFullYear(), d.getMonth() + dir, 1));
      monthSlide.setValue(dir * 20);
      Animated.parallel([
        Animated.timing(monthOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(monthSlide, { toValue: 0, friction: 7, useNativeDriver: true }),
      ]).start();
    });
  }

  const loadEvents = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchEvents(user.institution, user.department);
      setEvents(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load events.');
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  function handleDelete(e: CampusEvent) {
    Alert.alert('Delete Event', `Delete "${e.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteEvent(e.id); loadEvents(); } },
    ]);
  }

  function handleDayPress(day: number) {
    const clicked = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(clicked);
    setDateSheetVisible(true);
  }

  function handleAddFromDateSheet() {
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      setAddModalPrefill(`${y}-${m}-${d}`);
    }
    setAddModal(true);
  }

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewDate]);

  const eventDateSet = useMemo(() => {
    const s = new Set<string>();
    events.forEach(e => {
      const d = new Date(e.dueDate);
      s.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return s;
  }, [events]);

  function hasEvent(day: number | null) {
    if (!day) return false;
    return eventDateSet.has(`${viewDate.getFullYear()}-${viewDate.getMonth()}-${day}`);
  }
  function isToday(day: number | null) {
    if (!day) return false;
    return viewDate.getFullYear() === today.getFullYear() &&
      viewDate.getMonth() === today.getMonth() &&
      day === today.getDate();
  }

  const eventsOnSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(e => {
      const d = new Date(e.dueDate);
      return d.getFullYear() === selectedDate.getFullYear() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getDate() === selectedDate.getDate();
    });
  }, [events, selectedDate]);

  const filteredEvents = useMemo(() => {
    const f = filterType === 'All' ? events : events.filter(e => e.type === filterType);
    return f.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [events, filterType]);

  const upcomingCount = events.filter(e => !getCountdown(e.dueDate).overdue).length;
  const overdueCount = events.filter(e => getCountdown(e.dueDate).overdue).length;

  if (!user) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Header */}
            <Animated.View style={[styles.pageHeader, headerEntrance.style]}>
              <View>
                <Text style={[styles.pageTitle, { color: colors.text }]}>Calendar</Text>
                <Text style={[styles.pageSub, { color: colors.textMuted }]}>Deadlines & events</Text>
              </View>
              {canAddEvent(user.role) && (
                <Pressable
                  style={[styles.addBtn, { backgroundColor: colors.accent }]}
                  onPress={() => { setAddModalPrefill(''); setAddModal(true); }}
                  onPressIn={addBtnPress.onPressIn}
                  onPressOut={addBtnPress.onPressOut}
                >
                  <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, { transform: [{ scale: Animated.multiply(addBtnPress.scale, addBtnPop) }] }]}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Add Event</Text>
                  </Animated.View>
                </Pressable>
              )}
            </Animated.View>

            {/* Stats */}
            <Animated.View style={[styles.statsRow, statsEntrance.style]}>
              <StatBox label="Total" value={events.length} color={colors.accent} delay={0} colors={colors} />
              <StatBox label="Upcoming" value={upcomingCount} color={colors.green} delay={60} colors={colors} />
              <StatBox label="Overdue" value={overdueCount} color={colors.red} delay={120} colors={colors} />
            </Animated.View>

            {/* Calendar grid */}
            <Animated.View style={[styles.calCard, { backgroundColor: colors.card, borderColor: colors.border }, calEntrance.style]}>
              <View style={styles.monthNav}>
                <Pressable
                  onPress={() => changeMonth(-1)}
                  onPressIn={prevPress.onPressIn}
                  onPressOut={prevPress.onPressOut}
                  style={[styles.navBtn, { backgroundColor: colors.inputBg }]}
                >
                  <Animated.View style={{ transform: [{ scale: prevPress.scale }] }}>
                    <Ionicons name="chevron-back" size={18} color={colors.text} />
                  </Animated.View>
                </Pressable>
                <Animated.Text style={[styles.monthTitle, { color: colors.text, opacity: monthOpacity, transform: [{ translateX: monthSlide }] }]}>
                  {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
                </Animated.Text>
                <Pressable
                  onPress={() => changeMonth(1)}
                  onPressIn={nextPress.onPressIn}
                  onPressOut={nextPress.onPressOut}
                  style={[styles.navBtn, { backgroundColor: colors.inputBg }]}
                >
                  <Animated.View style={{ transform: [{ scale: nextPress.scale }] }}>
                    <Ionicons name="chevron-forward" size={18} color={colors.text} />
                  </Animated.View>
                </Pressable>
              </View>

              {/* Day name headers — Sun highlighted */}
              <View style={styles.dayRow}>
                {DAY_NAMES.map((d, i) => (
                  <Text
                    key={d}
                    style={[
                      styles.dayName,
                      { color: i === 0 ? '#ff4d4d' : colors.textSubtle },
                      i === 0 && styles.sundayHeaderText,
                    ]}
                  >
                    {d}
                  </Text>
                ))}
              </View>

              <View style={styles.grid}>
                {daysInMonth.map((day, i) => (
                  <CalCell
                    key={i}
                    day={day}
                    isToday={isToday(day)}
                    hasEvt={hasEvent(day)}
                    delay={i * 12}
                    colors={colors}
                    isSunday={i % 7 === 0}
                    onPress={handleDayPress}
                  />
                ))}
              </View>

              {/* Sunday legend */}
              <View style={styles.sundayLegend}>
                <View style={styles.sundayLegendDot} />
                <Text style={[styles.sundayLegendText, { color: colors.textSubtle }]}>Sundays highlighted in red</Text>
              </View>
            </Animated.View>

            {/* Filter chips */}
            <Text style={[styles.sectionTitle, { color: colors.textSubtle }]}>Events</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 20 }}>
                {(['All', ...EVENT_TYPES] as (EventType | 'All')[]).map(t => (
                  <FilterChip
                    key={t}
                    option={t}
                    active={filterType === t}
                    color={t === 'All' ? colors.accent : EVENT_COLORS[t]}
                    onSelect={(v) => setFilterType(v as EventType | 'All')}
                  />
                ))}
              </View>
            </ScrollView>

            {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />}
            {!loading && filteredEvents.length === 0 && (
              <EmptyEvents onAdd={canAddEvent(user.role) ? () => { setAddModalPrefill(''); setAddModal(true); } : undefined} colors={colors} />
            )}
          </>
        }
        data={filteredEvents}
        keyExtractor={e => e.id}
        renderItem={({ item, index }) => (
          <EventCard event={item} isOwner={item.createdBy === user.email} onDelete={handleDelete} index={index} colors={colors} />
        )}
        ListFooterComponent={<View style={{ height: 32 }} />}
      />

      {/* Date action sheet */}
      <DateActionSheet
        visible={dateSheetVisible}
        date={selectedDate}
        eventsOnDay={eventsOnSelectedDay}
        userRole={user.role}
        onClose={() => setDateSheetVisible(false)}
        onAddEvent={handleAddFromDateSheet}
        colors={colors}
      />

      {/* Add event modal */}
      <AddEventModal
        visible={addModal}
        onClose={() => setAddModal(false)}
        onAdded={loadEvents}
        user={user}
        colors={colors}
        prefillDate={addModalPrefill}
      />
    </View>
  );
}

function EmptyEvents({ onAdd, colors }: { onAdd?: () => void; colors: any }) {
  const entrance = useEntrance(0, 28);
  const iconPop = useIconPop(120);
  const press = usePressAnim(0.93);
  return (
    <Animated.View style={[styles.emptyWrap, entrance.style]}>
      <Animated.View style={{ transform: [{ scale: iconPop }] }}>
        <Ionicons name="calendar-outline" size={46} color={colors.textSubtle} />
      </Animated.View>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>No events found</Text>
      {onAdd && (
        <Pressable style={[styles.emptyBtn, { backgroundColor: colors.accent }]} onPress={onAdd} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
          <Animated.Text style={[styles.emptyBtnText, { transform: [{ scale: press.scale }] }]}>Add First Event</Animated.Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  pageTitle: { fontSize: 26, fontWeight: '800' },
  pageSub: { fontSize: 12, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 16 },
  statBox: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  calCard: { borderRadius: 20, padding: 16, borderWidth: 1, marginHorizontal: 20, marginBottom: 20 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 17, fontWeight: '800' },
  dayRow: { flexDirection: 'row', marginBottom: 8 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  sundayHeaderText: { fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  todayCellInner: {},
  sundayCellInner: { borderWidth: 1, borderColor: 'rgba(255,77,77,0.30)', borderRadius: 20 },
  dayNum: { fontSize: 13, fontWeight: '600' },
  eventDot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  sundayLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,77,77,0.20)' },
  sundayLegendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff4d4d', opacity: 0.7 },
  sundayLegendText: { fontSize: 10, fontStyle: 'italic' },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 4 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  filterChipText: { fontSize: 12, fontWeight: '700' },
  eventCard: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, marginHorizontal: 20, marginBottom: 10, overflow: 'hidden' },
  eventColorBar: { width: 4 },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingBottom: 4 },
  eventMeta: { flexDirection: 'row', gap: 6 },
  typeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 11, fontWeight: '700' },
  semBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  semText: { fontSize: 11, fontWeight: '600' },
  countdown: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  countdownText: { fontSize: 11, fontWeight: '700' },
  eventTitle: { fontSize: 15, fontWeight: '700', paddingHorizontal: 12, marginBottom: 4 },
  eventDesc: { fontSize: 12, paddingHorizontal: 12, lineHeight: 17, marginBottom: 6 },
  eventDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingBottom: 12 },
  eventDate: { fontSize: 11 },
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 10, paddingHorizontal: 20 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 },
  textInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, marginBottom: 16 },
  textArea: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 16, minHeight: 70, textAlignVertical: 'top' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 14 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  // Date action sheet
  dateSheetHeader: { marginBottom: 14 },
  dateSheetTitle: { fontSize: 15, fontWeight: '700', flex: 1, flexShrink: 1 },
  sundayTag: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#ff4d4d', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  sundayTagText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  miniEventRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, marginBottom: 6, overflow: 'hidden' },
  miniEventBar: { width: 3 },
  miniEventTitle: { fontSize: 13, fontWeight: '700', paddingHorizontal: 10, paddingTop: 7 },
  miniEventType: { fontSize: 11, fontWeight: '600', paddingHorizontal: 10, paddingBottom: 7 },
  moreEvents: { fontSize: 11, fontStyle: 'italic', paddingLeft: 4, marginTop: 2 },
  noEventsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 14 },
  noEventsText: { fontSize: 13 },
  noPermRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 4 },
  noPermText: { fontSize: 12, flex: 1 },
});
