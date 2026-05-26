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
  fetchProjects, toggleProjectScores, createProject,
  fetchSubmissions, submitWork,
} from '../lib/queries';
import { supabase, STORAGE_BUCKET, allowedFileTypes } from '../lib/supabase';
import { ProjectItem, Submission } from '../types';
import { useEntrance, usePressAnim } from '../lib/animations';

const PRIVILEGED_ROLES = ['admin', 'professor', 'hod', 'principal', 'dean'];

// ─── Create Project Modal ─────────────────────────────────────────────────────

function CreateProjectModal({
  visible, onClose, onCreated, user, colors,
}: { visible: boolean; onClose: () => void; onCreated: () => void; user: any; colors: any }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [status, setStatus] = useState<'planned' | 'active'>('planned');
  const [saving, setSaving] = useState(false);
  const sheetAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(sheetAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetAnim, { toValue: 600, duration: 180, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      setTitle(''); setSummary(''); setDeadline(''); setMaxScore(''); setStatus('planned');
    }
  }, [visible]);

  function isValidDate(s: string) {
    return /^\d{4}-\d{2}-\d{2}/.test(s) && !isNaN(new Date(s).getTime());
  }

  async function handleCreate() {
    if (!title.trim()) { Alert.alert('Required', 'Enter a project title.'); return; }
    if (!isValidDate(deadline)) { Alert.alert('Invalid Date', 'Enter date as YYYY-MM-DD.'); return; }
    setSaving(true);
    try {
      await createProject({
        title: title.trim(), summary: summary.trim(), deadline,
        status, institution: user.institution,
        department: user.department, year: user.year,
        postedBy: user.email, allowedFormats: ['pdf', 'image', 'document'],
        maxScore: maxScore ? Number(maxScore) : undefined,
      });
      onCreated(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create project.');
    } finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[styles.sheet, { backgroundColor: colors.card, transform: [{ translateY: sheetAnim }] }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>New Project</Text>

            <Text style={[styles.label, { color: colors.textMuted }]}>Title *</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g. E-Commerce Web App"
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} />

            <Text style={[styles.label, { color: colors.textMuted }]}>Summary</Text>
            <TextInput value={summary} onChangeText={setSummary} multiline placeholder="Project objectives and scope…"
              placeholderTextColor={colors.textSubtle}
              style={[styles.textarea, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} />

            <Text style={[styles.label, { color: colors.textMuted }]}>Status</Text>
            <View style={styles.statusRow}>
              {(['planned', 'active'] as const).map(s => (
                <Pressable
                  key={s}
                  style={[styles.statusChip, { borderColor: colors.border }, status === s && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.statusChipText, { color: status === s ? '#fff' : colors.textMuted }]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.rowFields}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Deadline *</Text>
                <TextInput value={deadline} onChangeText={setDeadline} placeholder="YYYY-MM-DD"
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
              style={[styles.primaryBtn, { backgroundColor: colors.purple ?? colors.accent }, saving && { opacity: 0.65 }]}
              onPress={handleCreate} disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="layers-outline" size={17} color="#fff" /><Text style={styles.primaryBtnText}>Create Project</Text></>}
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ─── Submit Sheet ─────────────────────────────────────────────────────────────

function SubmitSheet({
  visible, project, onClose, onSubmitted, user, colors,
}: { visible: boolean; project: ProjectItem | null; onClose: () => void; onSubmitted: () => void; user: any; colors: any }) {
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
      if (asset.size && asset.size > 100 * 1024 * 1024) { Alert.alert('Too large', 'File must be under 100 MB.'); return; }
      setFile(asset);
    }
  }

  async function handleSubmit() {
    if (!file || !project || !user) return;
    const isLate = new Date(project.deadline).getTime() < Date.now();
    setUploading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const filePath = `submissions/${user.institution}/${user.department}/projects/${project.id}/${Date.now()}-${file.name}`;
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, bytes.buffer, { contentType: file.mimeType || 'application/octet-stream' });
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      const fileType = file.mimeType?.includes('pdf') ? 'pdf'
        : file.mimeType?.includes('image') ? 'image' : 'document';

      await submitWork({
        projectId: project.id,
        studentEmail: user.email,
        studentName: user.studentName || user.email.split('@')[0],
        fileUrl: urlData.publicUrl,
        fileName: file.name, fileType,
        institution: user.institution,
        department: user.department, year: user.year,
        isLate,
      });

      Alert.alert('Submitted!', isLate ? 'Recorded as late submission.' : 'Project submitted successfully.');
      onSubmitted(); onClose();
    } catch (e: any) {
      if (e?.message) Alert.alert('Upload Failed', e.message);
    } finally { setUploading(false); }
  }

  if (!project) return null;
  const daysLeft = Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86_400_000);
  const isLate = daysLeft < 0;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: colors.card, transform: [{ translateY: sheetAnim }] }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Submit Project</Text>

          <View style={[styles.submissionInfo, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.submissionInfoTitle, { color: colors.text }]} numberOfLines={2}>{project.title}</Text>
            <View style={[styles.badge, { backgroundColor: isLate ? `${colors.red}14` : `${colors.green}14` }]}>
              <Text style={[styles.badgeText, { color: isLate ? colors.red : colors.green }]}>
                {isLate ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
              </Text>
            </View>
          </View>

          <Pressable
            style={[styles.filePicker, { borderColor: file ? colors.green : colors.border, backgroundColor: colors.bg }]}
            onPress={pickFile}
          >
            <Ionicons name={file ? 'document-attach' : 'attach-outline'} size={20} color={file ? colors.green : colors.accent} />
            <Text style={[styles.filePickerText, { color: file ? colors.green : colors.textMuted }]} numberOfLines={1}>
              {file ? file.name : 'Choose file — PDF, scan, or photo'}
            </Text>
            {file && <Ionicons name="checkmark-circle" size={18} color={colors.green} />}
          </Pressable>

          {isLate && (
            <View style={[styles.lateBanner, { backgroundColor: `${colors.red}10`, borderColor: `${colors.red}30` }]}>
              <Ionicons name="warning-outline" size={14} color={colors.red} />
              <Text style={[styles.lateText, { color: colors.red }]}>This project is past its deadline. Submission will be marked late.</Text>
            </View>
          )}

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: file ? (colors.purple ?? colors.accent) : colors.border }, uploading && { opacity: 0.65 }]}
            onPress={handleSubmit} disabled={!file || uploading}
          >
            {uploading
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="cloud-upload-outline" size={17} color="#fff" /><Text style={styles.primaryBtnText}>Submit Project</Text></>}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Submissions Modal (professors) ───────────────────────────────────────────

function SubmissionsModal({
  visible, project, onClose, colors,
}: { visible: boolean; project: ProjectItem | null; onClose: () => void; colors: any }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const sheetAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && project) {
      setLoading(true);
      fetchSubmissions('project', project.id)
        .then(setSubmissions).catch(() => setSubmissions([]))
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
  }, [visible, project]);

  if (!project) return null;

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
          <Text style={[styles.submissionInfoTitle, { color: colors.textMuted, marginBottom: 14 }]} numberOfLines={1}>{project.title}</Text>

          {loading ? <ActivityIndicator color={colors.accent} /> : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {submissions.length === 0 ? (
                <View style={styles.emptySubmissions}>
                  <Ionicons name="layers-outline" size={36} color={colors.textSubtle} />
                  <Text style={[styles.emptySubmissionsText, { color: colors.textMuted }]}>No submissions yet</Text>
                </View>
              ) : (
                submissions.map(sub => (
                  <View key={sub.id} style={[styles.submissionRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <View style={[styles.submAvatar, { backgroundColor: `${colors.purple ?? colors.accent}18` }]}>
                      <Text style={[styles.submAvatarText, { color: colors.purple ?? colors.accent }]}>
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
                        color: sub.status === 'late' ? colors.red : sub.status === 'graded' ? colors.green : colors.accent,
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

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  item, delay, isPrivileged, onToggleScores, onSubmit, onViewSubmissions,
}: {
  item: ProjectItem;
  delay: number;
  isPrivileged: boolean;
  onToggleScores: (item: ProjectItem) => void;
  onSubmit: (item: ProjectItem) => void;
  onViewSubmissions: (item: ProjectItem) => void;
}) {
  const { colors } = useTheme();
  const entrance = useEntrance(delay, 20);
  const daysLeft = Math.ceil((new Date(item.deadline).getTime() - Date.now()) / 86_400_000);
  const statusColor = item.status === 'completed' ? colors.green : item.status === 'active' ? colors.accent : colors.textSubtle;
  const statusLabel = { planned: 'Planned', active: 'Active', completed: 'Done' }[item.status];
  const statusIcon = { planned: 'time-outline', active: 'flash-outline', completed: 'checkmark-circle-outline' }[item.status];
  const progress = item.status === 'completed' ? 1 : item.status === 'active' ? 0.6 : 0.15;

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, entrance.style]}>
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
      {item.summary ? (
        <Text style={[styles.cardSummary, { color: colors.textMuted }]} numberOfLines={2}>{item.summary}</Text>
      ) : null}

      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: statusColor }]} />
      </View>

      {item.maxScore != null && (
        <View style={styles.scoreRow}>
          <Ionicons name="star-outline" size={12} color={colors.textSubtle} />
          <Text style={[styles.dateText, { color: colors.textSubtle }]}>Max: {item.maxScore}</Text>
          <View style={[styles.visibilityBadge, { backgroundColor: item.scoresVisible ? `${colors.green}14` : `${colors.textSubtle}14` }]}>
            <Ionicons name={item.scoresVisible ? 'eye-outline' : 'eye-off-outline'} size={11} color={item.scoresVisible ? colors.green : colors.textSubtle} />
            <Text style={[styles.visibilityText, { color: item.scoresVisible ? colors.green : colors.textSubtle }]}>
              {item.scoresVisible ? 'Scores visible' : 'Scores hidden'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={12} color={colors.textSubtle} />
        <Text style={[styles.dateText, { color: colors.textSubtle }]}>{new Date(item.deadline).toDateString()}</Text>

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
                style={[styles.actionBtn, { backgroundColor: `${colors.purple ?? colors.accent}14` }]}
                onPress={() => onViewSubmissions(item)}
              >
                <Ionicons name="list-outline" size={13} color={colors.purple ?? colors.accent} />
                <Text style={[styles.actionBtnText, { color: colors.purple ?? colors.accent }]}>Submissions</Text>
              </Pressable>
            </>
          ) : (
            item.status !== 'completed' && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: `${colors.purple ?? colors.accent}14` }]}
                onPress={() => onSubmit(item)}
              >
                <Ionicons name="cloud-upload-outline" size={13} color={colors.purple ?? colors.accent} />
                <Text style={[styles.actionBtnText, { color: colors.purple ?? colors.accent }]}>Submit</Text>
              </Pressable>
            )
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

function buildReport(items: ProjectItem[]): string {
  const header = ['Title', 'Department', 'Year', 'Deadline', 'Status', 'Max Score', 'Scores Visible', 'Posted By'].join('\t');
  const rows = items.map(p => [
    p.title, p.department, p.year,
    new Date(p.deadline).toDateString(),
    p.status, p.maxScore ?? 'N/A',
    p.scoresVisible ? 'Yes' : 'No', p.postedBy ?? '',
  ].join('\t'));
  return [header, ...rows].join('\n');
}

export default function ProjectsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [submitSheet, setSubmitSheet] = useState(false);
  const [submissionsModal, setSubmissionsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProjectItem | null>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const isPrivileged = PRIVILEGED_ROLES.includes(user?.role ?? '');

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const loadProjects = useCallback(() => {
    if (!user) return;
    fetchProjects(user.institution, user.department, user.year)
      .then(r => { setProjects(r); setLoading(false); });
  }, [user]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleToggleScores = (item: ProjectItem) => {
    const next = !item.scoresVisible;
    Alert.alert(
      `${next ? 'Reveal' : 'Hide'} Scores`,
      `${next ? 'Students will see' : 'Students will no longer see'} scores for "${item.title}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Reveal' : 'Hide', onPress: async () => {
            try {
              await toggleProjectScores(item.id, next);
              setProjects(prev => prev.map(p => p.id === item.id ? { ...p, scoresVisible: next } : p));
            } catch (e: any) { Alert.alert('Error', e.message || 'Could not update visibility.'); }
          },
        },
      ],
    );
  };

  const handleExport = async () => {
    if (!projects.length) { Alert.alert('No data', 'No projects to export.'); return; }
    await Share.share({ message: buildReport(projects), title: `${user?.department} Projects Report` });
  };

  if (!user) return null;

  const active = projects.filter(p => p.status === 'active').length;
  const done = projects.filter(p => p.status === 'completed').length;
  const overdue = projects.filter(p => new Date(p.deadline).getTime() < Date.now() && p.status !== 'completed').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.pageHeader, { opacity: headerAnim }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Projects</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Team progress and milestones</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.stats}>
              <View style={styles.miniStat}>
                <Text style={[styles.miniVal, { color: colors.green }]}>{active}</Text>
                <Text style={[styles.miniLabel, { color: colors.textSubtle }]}>Active</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniVal, { color: colors.accent }]}>{done}</Text>
                <Text style={[styles.miniLabel, { color: colors.textSubtle }]}>Done</Text>
              </View>
            </View>
            <View style={styles.headerBtns}>
              {isPrivileged && (
                <Pressable style={[styles.newBtn, { backgroundColor: colors.purple ?? colors.accent }]} onPress={() => setCreateModal(true)}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.newBtnText}>New</Text>
                </Pressable>
              )}
              {isPrivileged && (
                <Pressable style={[styles.exportBtn, { backgroundColor: colors.accentBg, borderColor: colors.accent }]} onPress={handleExport}>
                  <Ionicons name="share-outline" size={15} color={colors.accent} />
                </Pressable>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Overdue banner for students */}
        {!isPrivileged && overdue > 0 && (
          <View style={[styles.overdueBanner, { backgroundColor: `${colors.red}12`, borderColor: `${colors.red}30` }]}>
            <Ionicons name="alert-circle" size={16} color={colors.red} />
            <Text style={[styles.overdueText, { color: colors.red }]}>
              {overdue} project{overdue !== 1 ? 's' : ''} past deadline — submit now
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.empty}>
            <Ionicons name="hourglass-outline" size={32} color={colors.textSubtle} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading…</Text>
          </View>
        ) : projects.length ? (
          projects.map((p, i) => (
            <ProjectCard
              key={p.id}
              item={p}
              delay={i * 70}
              isPrivileged={isPrivileged}
              onToggleScores={handleToggleScores}
              onSubmit={(item) => { setSelectedItem(item); setSubmitSheet(true); }}
              onViewSubmissions={(item) => { setSelectedItem(item); setSubmissionsModal(true); }}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="layers-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No projects yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSubtle }]}>No group projects for your department.</Text>
            {isPrivileged && (
              <Pressable style={[styles.newBtn, { backgroundColor: colors.purple ?? colors.accent, paddingHorizontal: 20, marginTop: 6 }]} onPress={() => setCreateModal(true)}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.newBtnText}>Add Project</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <CreateProjectModal visible={createModal} onClose={() => setCreateModal(false)} onCreated={loadProjects} user={user} colors={colors} />
      <SubmitSheet visible={submitSheet} project={selectedItem} onClose={() => setSubmitSheet(false)} onSubmitted={loadProjects} user={user} colors={colors} />
      <SubmissionsModal visible={submissionsModal} project={selectedItem} onClose={() => setSubmissionsModal(false)} colors={colors} />
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
  stats: { flexDirection: 'row', gap: 14 },
  miniStat: { alignItems: 'center' },
  miniVal: { fontSize: 20, fontWeight: '800' },
  miniLabel: { fontSize: 10, fontWeight: '600' },
  headerBtns: { flexDirection: 'row', gap: 6 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  exportBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 },
  overdueBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
  overdueText: { fontSize: 13, fontWeight: '600', flex: 1 },
  card: { borderRadius: 18, padding: 15, marginBottom: 11, borderWidth: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  deadline: { fontSize: 12, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 5 },
  cardSummary: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  visibilityBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  visibilityText: { fontSize: 10, fontWeight: '700' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  dateText: { fontSize: 12 },
  cardActions: { marginLeft: 'auto', flexDirection: 'row', gap: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  actionBtnText: { fontSize: 11, fontWeight: '700' },
  statusChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1.5 },
  statusChipText: { fontWeight: '700', fontSize: 13 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
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
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  submissionInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14, gap: 8 },
  submissionInfoTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  badge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  filePicker: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', padding: 14, marginBottom: 14 },
  filePickerText: { flex: 1, fontSize: 13 },
  lateBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 14 },
  lateText: { fontSize: 12, flex: 1, lineHeight: 17 },
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
