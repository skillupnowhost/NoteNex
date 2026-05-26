import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import {
  fetchAssignments, toggleAssignmentScores, createAssignment,
  fetchSubmissions, fetchMySubmission, submitWork,
} from '../lib/queries';
import { supabase, STORAGE_BUCKET, allowedFileTypes } from '../lib/supabase';
import { AssignmentItem, Submission } from '../types';
import { useEntrance, usePressAnim } from '../lib/animations';

const PRIVILEGED_ROLES = ['admin', 'professor', 'hod', 'principal', 'dean'];

function urgency(dueDate: string, colors: any): { label: string; color: string; bg: string } {
  const diff = new Date(dueDate).getTime() - Date.now();
  const days = diff / 86_400_000;
  if (diff <= 0) {
    const overdueDays = Math.ceil(Math.abs(diff) / 86_400_000);
    return { label: overdueDays > 0 ? `${overdueDays}d overdue` : 'Overdue', color: colors.red, bg: `${colors.red}14` };
  }
  if (days < 1) return { label: 'Due today', color: colors.amber, bg: `${colors.amber}14` };
  if (days < 3) return { label: `${Math.ceil(days)}d left`, color: colors.amber, bg: `${colors.amber}14` };
  return { label: `${Math.floor(days)}d left`, color: colors.green, bg: `${colors.green}14` };
}

// ─── Create Assignment Modal ───────────────────────────────────────────────────

function CreateAssignmentModal({
  visible, onClose, onCreated, user, colors,
}: { visible: boolean; onClose: () => void; onCreated: () => void; user: any; colors: any }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [saving, setSaving] = useState(false);
  const sheetAnim = useRef(new Animated.Value(500)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

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
      setTitle(''); setDesc(''); setDueDate(''); setMaxScore('');
    }
  }, [visible]);

  function isValidDate(s: string) {
    return /^\d{4}-\d{2}-\d{2}/.test(s) && !isNaN(new Date(s).getTime());
  }

  async function handleCreate() {
    if (!title.trim()) { Alert.alert('Required', 'Enter an assignment title.'); return; }
    if (!isValidDate(dueDate)) { Alert.alert('Invalid Date', 'Enter date as YYYY-MM-DD.'); return; }
    setSaving(true);
    try {
      await createAssignment({
        title: title.trim(), description: desc.trim(),
        dueDate, institution: user.institution,
        department: user.department, year: user.year,
        postedBy: user.email, allowedFormats: ['pdf', 'image', 'document'],
        maxScore: maxScore ? Number(maxScore) : undefined,
      });
      onCreated(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create assignment.');
    } finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[styles.sheet, { backgroundColor: colors.card, transform: [{ translateY: sheetAnim }] }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>New Assignment</Text>

            <Text style={[styles.label, { color: colors.textMuted }]}>Title *</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Data Structures Assignment 2"
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} />

            <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
            <TextInput value={desc} onChangeText={setDesc} multiline placeholder="Instructions for students…"
              placeholderTextColor={colors.textSubtle}
              style={[styles.textarea, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} />

            <View style={styles.rowFields}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Due Date *</Text>
                <TextInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSubtle}
                  style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Max Score</Text>
                <TextInput value={maxScore} onChangeText={setMaxScore} placeholder="100"
                  keyboardType="numeric" placeholderTextColor={colors.textSubtle}
                  style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} />
              </View>
            </View>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.accent }, saving && { opacity: 0.65 }]}
              onPress={handleCreate} disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="document-text-outline" size={17} color="#fff" /><Text style={styles.primaryBtnText}>Create Assignment</Text></>}
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ─── Submit Sheet ─────────────────────────────────────────────────────────────

function SubmitSheet({
  visible, assignment, onClose, onSubmitted, user, colors,
}: { visible: boolean; assignment: AssignmentItem | null; onClose: () => void; onSubmitted: () => void; user: any; colors: any }) {
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const sheetAnim = useRef(new Animated.Value(400)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(sheetAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetAnim, { toValue: 400, duration: 180, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      setFile(null);
    }
  }, [visible]);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({ type: allowedFileTypes, copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      if (asset.size && asset.size > 50 * 1024 * 1024) {
        Alert.alert('Too large', 'Submission must be under 50 MB.'); return;
      }
      setFile(asset);
    }
  }

  async function handleSubmit() {
    if (!file || !assignment || !user) return;
    const isLate = new Date(assignment.dueDate).getTime() < Date.now();

    if (isLate) {
      let shouldProceed = false;
      await new Promise<void>((resolve) => {
        Alert.alert('Submission Late', 'This deadline has passed. Submit anyway?', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
          { text: 'Submit Anyway', onPress: () => { shouldProceed = true; resolve(); } },
        ]);
      });
      if (!shouldProceed) return;
    }

    setUploading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const filePath = `submissions/${user.institution}/${user.department}/${assignment.id}/${Date.now()}-${file.name}`;
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, bytes.buffer, { contentType: file.mimeType || 'application/octet-stream' });
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

      const fileType = file.mimeType?.includes('pdf') ? 'pdf'
        : file.mimeType?.includes('image') ? 'image' : 'document';

      await submitWork({
        assignmentId: assignment.id,
        studentEmail: user.email,
        studentName: user.studentName || user.email.split('@')[0],
        fileUrl: urlData.publicUrl,
        fileName: file.name,
        fileType,
        institution: user.institution,
        department: user.department,
        year: user.year,
        isLate,
      });

      Alert.alert('Submitted!', isLate ? 'Your submission was recorded (late).' : 'Your assignment was submitted successfully.');
      onSubmitted();
      onClose();
    } catch (e: any) {
      if (e?.message) Alert.alert('Upload Failed', e.message);
    } finally {
      setUploading(false);
    }
  }

  if (!assignment) return null;

  const u = urgency(assignment.dueDate, colors);
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: colors.card, transform: [{ translateY: sheetAnim }] }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Submit Assignment</Text>

          <View style={[styles.submissionInfo, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.submissionInfoTitle, { color: colors.text }]} numberOfLines={2}>{assignment.title}</Text>
            <View style={[styles.badge, { backgroundColor: u.bg }]}>
              <Text style={[styles.badgeText, { color: u.color }]}>{u.label}</Text>
            </View>
          </View>

          <Pressable
            style={[styles.filePicker, { borderColor: file ? colors.green : colors.border, backgroundColor: colors.bg }]}
            onPress={pickFile}
          >
            <Ionicons name={file ? 'document-attach' : 'attach-outline'} size={20} color={file ? colors.green : colors.accent} />
            <Text style={[styles.filePickerText, { color: file ? colors.green : colors.textMuted }]} numberOfLines={1}>
              {file ? file.name : 'Choose file (PDF, photo, or document)'}
            </Text>
            {file && <Ionicons name="checkmark-circle" size={18} color={colors.green} />}
          </Pressable>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: file ? colors.accent : colors.border }, uploading && { opacity: 0.65 }]}
            onPress={handleSubmit}
            disabled={!file || uploading}
          >
            {uploading
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="cloud-upload-outline" size={17} color="#fff" /><Text style={styles.primaryBtnText}>Submit</Text></>}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Submissions Modal (professors) ───────────────────────────────────────────

function SubmissionsModal({
  visible, assignment, onClose, colors,
}: { visible: boolean; assignment: AssignmentItem | null; onClose: () => void; colors: any }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const sheetAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && assignment) {
      setLoading(true);
      fetchSubmissions('assignment', assignment.id)
        .then(setSubmissions)
        .catch(() => setSubmissions([]))
        .finally(() => setLoading(false));
      Animated.parallel([
        Animated.spring(sheetAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetAnim, { toValue: 600, duration: 180, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, assignment]);

  if (!assignment) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View style={[styles.sheet, styles.sheetTall, { backgroundColor: colors.card, transform: [{ translateY: sheetAnim }] }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetTitleRow}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Submissions</Text>
            <Text style={[styles.submCount, { color: colors.textSubtle }]}>{submissions.length} received</Text>
          </View>
          <Text style={[styles.submissionInfoTitle, { color: colors.textMuted, marginBottom: 14 }]} numberOfLines={1}>{assignment.title}</Text>

          {loading ? <ActivityIndicator color={colors.accent} /> : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {submissions.length === 0 ? (
                <View style={styles.emptySubmissions}>
                  <Ionicons name="document-outline" size={36} color={colors.textSubtle} />
                  <Text style={[styles.emptySubmissionsText, { color: colors.textMuted }]}>No submissions yet</Text>
                </View>
              ) : (
                submissions.map(sub => (
                  <View key={sub.id} style={[styles.submissionRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <View style={[styles.submAvatar, { backgroundColor: `${colors.accent}18` }]}>
                      <Text style={[styles.submAvatarText, { color: colors.accent }]}>
                        {(sub.studentEmail || '??').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.submName, { color: colors.text }]} numberOfLines={1}>{sub.studentName || sub.studentEmail}</Text>
                      <Text style={[styles.submMeta, { color: colors.textSubtle }]}>
                        {new Date(sub.submittedAt).toLocaleString()} · {sub.fileName}
                      </Text>
                    </View>
                    <View style={[styles.submStatusBadge, {
                      backgroundColor: sub.status === 'late' ? `${colors.red}14`
                        : sub.status === 'graded' ? `${colors.green}14`
                        : `${colors.accent}14`,
                    }]}>
                      <Text style={[styles.submStatusText, {
                        color: sub.status === 'late' ? colors.red
                          : sub.status === 'graded' ? colors.green
                          : colors.accent,
                      }]}>{sub.status}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Assignment Card ──────────────────────────────────────────────────────────

function AssignmentCard({
  item, delay, isPrivileged, onToggleScores, onSubmit, onViewSubmissions,
}: {
  item: AssignmentItem;
  delay: number;
  isPrivileged: boolean;
  onToggleScores: (item: AssignmentItem) => void;
  onSubmit: (item: AssignmentItem) => void;
  onViewSubmissions: (item: AssignmentItem) => void;
}) {
  const { colors } = useTheme();
  const entrance = useEntrance(delay, 20);
  const u = urgency(item.dueDate, colors);

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, entrance.style]}>
      <View style={styles.cardTop}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
        <View style={[styles.badge, { backgroundColor: u.bg }]}>
          <Text style={[styles.badgeText, { color: u.color }]}>{u.label}</Text>
        </View>
      </View>

      {item.description ? (
        <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={2}>{item.description}</Text>
      ) : null}

      {item.maxScore != null && (
        <View style={styles.scoreRow}>
          <Ionicons name="star-outline" size={12} color={colors.textSubtle} />
          <Text style={[styles.footerText, { color: colors.textSubtle }]}>Max score: {item.maxScore}</Text>
          <View style={[styles.visibilityBadge, { backgroundColor: item.scoresVisible ? `${colors.green}14` : `${colors.textSubtle}14` }]}>
            <Ionicons name={item.scoresVisible ? 'eye-outline' : 'eye-off-outline'} size={11} color={item.scoresVisible ? colors.green : colors.textSubtle} />
            <Text style={[styles.visibilityText, { color: item.scoresVisible ? colors.green : colors.textSubtle }]}>
              {item.scoresVisible ? 'Scores visible' : 'Scores hidden'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Ionicons name="calendar-outline" size={12} color={colors.textSubtle} />
        <Text style={[styles.footerText, { color: colors.textSubtle }]}>{new Date(item.dueDate).toDateString()}</Text>
        <Text style={[styles.dot, { color: colors.textSubtle }]}>·</Text>
        <Ionicons name="person-outline" size={12} color={colors.textSubtle} />
        <Text style={[styles.footerText, { color: colors.textSubtle }]}>{item.postedBy}</Text>

        <View style={styles.cardActions}>
          {isPrivileged ? (
            <>
              {item.maxScore != null && (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: item.scoresVisible ? `${colors.green}18` : `${colors.textSubtle}14` }]}
                  onPress={() => onToggleScores(item)}
                >
                  <Ionicons name={item.scoresVisible ? 'eye' : 'eye-off'} size={13} color={item.scoresVisible ? colors.green : colors.textSubtle} />
                </Pressable>
              )}
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.accentBg }]}
                onPress={() => onViewSubmissions(item)}
              >
                <Ionicons name="list-outline" size={13} color={colors.accent} />
                <Text style={[styles.actionBtnText, { color: colors.accent }]}>Submissions</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.accentBg }]}
              onPress={() => onSubmit(item)}
            >
              <Ionicons name="cloud-upload-outline" size={13} color={colors.accent} />
              <Text style={[styles.actionBtnText, { color: colors.accent }]}>Submit</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Overdue Banner ───────────────────────────────────────────────────────────

function OverdueBanner({ count, colors }: { count: number; colors: any }) {
  const entrance = useEntrance(0, 14);
  if (count === 0) return null;
  return (
    <Animated.View style={[styles.overdueBanner, { backgroundColor: `${colors.red}12`, borderColor: `${colors.red}30` }, entrance.style]}>
      <Ionicons name="alert-circle" size={16} color={colors.red} />
      <Text style={[styles.overdueText, { color: colors.red }]}>
        {count} assignment{count !== 1 ? 's' : ''} overdue — submit as soon as possible
      </Text>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

function buildReport(items: AssignmentItem[]): string {
  const header = ['Title', 'Department', 'Year', 'Due Date', 'Posted By', 'Max Score', 'Scores Visible'].join('\t');
  const rows = items.map(a => [
    a.title, a.department, a.year,
    new Date(a.dueDate).toDateString(), a.postedBy,
    a.maxScore ?? 'N/A', a.scoresVisible ? 'Yes' : 'No',
  ].join('\t'));
  return [header, ...rows].join('\n');
}

export default function AssignmentsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [submitSheet, setSubmitSheet] = useState(false);
  const [submissionsModal, setSubmissionsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AssignmentItem | null>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const isPrivileged = PRIVILEGED_ROLES.includes(user?.role ?? '');

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const loadItems = useCallback(() => {
    if (!user) return;
    fetchAssignments(user.institution, user.department, user.year)
      .then(r => { setItems(r); setLoading(false); });
  }, [user]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleToggleScores = async (item: AssignmentItem) => {
    const next = !item.scoresVisible;
    Alert.alert(
      `${next ? 'Reveal' : 'Hide'} Scores`,
      `${next ? 'Students will see' : 'Students will no longer see'} scores for "${item.title}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Reveal' : 'Hide', onPress: async () => {
            try {
              await toggleAssignmentScores(item.id, next);
              setItems(prev => prev.map(a => a.id === item.id ? { ...a, scoresVisible: next } : a));
            } catch (e: any) { Alert.alert('Error', e.message); }
          },
        },
      ],
    );
  };

  const handleExport = async () => {
    if (!items.length) { Alert.alert('No data', 'No assignments to export.'); return; }
    await Share.share({ message: buildReport(items), title: `${user?.department} Assignments Report` });
  };

  if (!user) return null;

  const overdue = items.filter(a => new Date(a.dueDate).getTime() < Date.now()).length;
  const upcoming = items.length - overdue;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.pageHeader, { opacity: headerAnim }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Assignments</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Deadlines and submissions</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.badges}>
              {upcoming > 0 && (
                <View style={[styles.chip, { backgroundColor: colors.greenBg }]}>
                  <Text style={[styles.chipText, { color: colors.green }]}>{upcoming} upcoming</Text>
                </View>
              )}
              {overdue > 0 && (
                <View style={[styles.chip, { backgroundColor: `${colors.red}14` }]}>
                  <Text style={[styles.chipText, { color: colors.red }]}>{overdue} overdue</Text>
                </View>
              )}
            </View>
            <View style={styles.headerBtns}>
              {isPrivileged && (
                <Pressable
                  style={[styles.newBtn, { backgroundColor: colors.accent }]}
                  onPress={() => setCreateModal(true)}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.newBtnText}>New</Text>
                </Pressable>
              )}
              {isPrivileged && (
                <Pressable
                  style={[styles.exportBtn, { backgroundColor: colors.accentBg, borderColor: colors.accent }]}
                  onPress={handleExport}
                >
                  <Ionicons name="share-outline" size={15} color={colors.accent} />
                </Pressable>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Overdue alert banner */}
        {!isPrivileged && <OverdueBanner count={overdue} colors={colors} />}

        {loading ? (
          <View style={styles.empty}>
            <Ionicons name="hourglass-outline" size={32} color={colors.textSubtle} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading…</Text>
          </View>
        ) : items.length ? (
          items.map((a, i) => (
            <AssignmentCard
              key={a.id}
              item={a}
              delay={i * 60}
              isPrivileged={isPrivileged}
              onToggleScores={handleToggleScores}
              onSubmit={(item) => { setSelectedItem(item); setSubmitSheet(true); }}
              onViewSubmissions={(item) => { setSelectedItem(item); setSubmissionsModal(true); }}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No assignments</Text>
            <Text style={[styles.emptyText, { color: colors.textSubtle }]}>Nothing due for your class yet.</Text>
            {isPrivileged && (
              <Pressable style={[styles.newBtn, { backgroundColor: colors.accent, paddingHorizontal: 20, marginTop: 6 }]} onPress={() => setCreateModal(true)}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.newBtnText}>Add Assignment</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <CreateAssignmentModal
        visible={createModal}
        onClose={() => setCreateModal(false)}
        onCreated={loadItems}
        user={user}
        colors={colors}
      />
      <SubmitSheet
        visible={submitSheet}
        assignment={selectedItem}
        onClose={() => setSubmitSheet(false)}
        onSubmitted={loadItems}
        user={user}
        colors={colors}
      />
      <SubmissionsModal
        visible={submissionsModal}
        assignment={selectedItem}
        onClose={() => setSubmissionsModal(false)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 32, paddingHorizontal: 20 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  pageTitle: { fontSize: 26, fontWeight: '800' },
  pageSubtitle: { fontSize: 13, marginTop: 3 },
  headerRight: { gap: 6, alignItems: 'flex-end' },
  badges: { gap: 5, alignItems: 'flex-end' },
  chip: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { fontSize: 11, fontWeight: '700' },
  headerBtns: { flexDirection: 'row', gap: 6 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  exportBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 },
  overdueBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
  overdueText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
  card: { borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  badge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  visibilityBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  visibilityText: { fontSize: 10, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  footerText: { fontSize: 12 },
  dot: { fontSize: 12 },
  cardActions: { marginLeft: 'auto', flexDirection: 'row', gap: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  actionBtnText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 56, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center' },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetTall: { maxHeight: '80%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  submCount: { fontSize: 13 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14, marginBottom: 14 },
  textarea: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14, marginBottom: 14, minHeight: 80, textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', gap: 10 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  submissionInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14, gap: 8 },
  submissionInfoTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  filePicker: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', padding: 14, marginBottom: 16 },
  filePickerText: { flex: 1, fontSize: 13 },
  submissionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  submAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  submAvatarText: { fontSize: 12, fontWeight: '800' },
  submName: { fontSize: 13, fontWeight: '600' },
  submMeta: { fontSize: 11, marginTop: 2 },
  submStatusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  submStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  emptySubmissions: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptySubmissionsText: { fontSize: 14 },
});
