import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import {
  supabase,
  allowedFileTypes,
  STORAGE_BUCKET,
  getShareMessage,
} from '../lib/supabase';
import {
  createGroup,
  fetchPublicGroups,
  sendGroupMessage,
  Group,
} from '../lib/queries';
import { useEntrance, useIconPop, usePressAnim, usePulse } from '../lib/animations';

type VisibilityScope = 'college' | 'department' | 'group';

// ─── Group Dropdown ───────────────────────────────────────────────────────────

function GroupDropdown({
  groups, selected, onSelect, onOpenCreate, colors,
}: {
  groups: Group[];
  selected: Group | null;
  onSelect: (g: Group | null) => void;
  onOpenCreate: () => void;
  colors: any;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Link to Group (optional)</Text>
      <Pressable
        style={[styles.dropdown, { backgroundColor: colors.card, borderColor: open ? colors.accent : colors.border }]}
        onPress={() => setOpen(v => !v)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Ionicons name="people-outline" size={16} color={selected ? colors.accent : colors.textMuted} />
          <Text style={{ color: selected ? colors.text : colors.textSubtle, fontSize: 14, flex: 1 }} numberOfLines={1}>
            {selected ? selected.name : 'No group selected'}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>

      {open && (
        <View style={[styles.dropdownList, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
          <Pressable
            style={styles.dropdownItem}
            onPress={() => { onSelect(null); setOpen(false); }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>None</Text>
            {!selected && <Ionicons name="checkmark" size={14} color={colors.accent} />}
          </Pressable>
          {groups.map(g => (
            <Pressable
              key={g.id}
              style={[styles.dropdownItem, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              onPress={() => { onSelect(g); setOpen(false); }}
            >
              <Ionicons name="people-outline" size={14} color={colors.textMuted} />
              <Text style={{ color: colors.text, fontSize: 14, flex: 1 }} numberOfLines={1}>{g.name}</Text>
              {selected?.id === g.id && <Ionicons name="checkmark" size={14} color={colors.accent} />}
            </Pressable>
          ))}
          <Pressable
            style={[styles.dropdownItem, styles.dropdownItemNew, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            onPress={() => { setOpen(false); onOpenCreate(); }}
          >
            <Ionicons name="add-circle-outline" size={14} color={colors.green} />
            <Text style={{ color: colors.green, fontSize: 14, fontWeight: '700' }}>Create New Group</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Visibility Scope Dropdown ────────────────────────────────────────────────

const SCOPE_OPTIONS: { value: VisibilityScope; label: string; icon: string; desc: string }[] = [
  { value: 'college', label: 'College', icon: 'school-outline', desc: 'All users in your institution' },
  { value: 'department', label: 'Department', icon: 'git-branch-outline', desc: 'Users in your department only' },
  { value: 'group', label: 'Specific Group', icon: 'people-outline', desc: 'Only members of a chosen group' },
];

function ScopeDropdown({
  selected, onSelect, colors,
}: {
  selected: VisibilityScope;
  onSelect: (s: VisibilityScope) => void;
  colors: any;
}) {
  const [open, setOpen] = useState(false);
  const current = SCOPE_OPTIONS.find(o => o.value === selected)!;

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Visible to</Text>
      <Pressable
        style={[styles.dropdown, { backgroundColor: colors.card, borderColor: open ? colors.red : colors.border }]}
        onPress={() => setOpen(v => !v)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Ionicons name={current.icon as any} size={16} color={colors.red} />
          <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>{current.label}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>

      {open && (
        <View style={[styles.dropdownList, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
          {SCOPE_OPTIONS.map((opt, i) => (
            <Pressable
              key={opt.value}
              style={[styles.dropdownItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              onPress={() => { onSelect(opt.value); setOpen(false); }}
            >
              <Ionicons name={opt.icon as any} size={14} color={selected === opt.value ? colors.red : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{opt.label}</Text>
                <Text style={{ color: colors.textSubtle, fontSize: 11 }}>{opt.desc}</Text>
              </View>
              {selected === opt.value && <Ionicons name="checkmark" size={14} color={colors.red} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Create Group Sheet ───────────────────────────────────────────────────────

function CreateGroupSheet({
  visible, onClose, onCreated, user, colors,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (g: Group) => void;
  user: any;
  colors: any;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(320)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 320, duration: 200, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Enter a group name.'); return; }
    setSaving(true);
    try {
      const group = await createGroup({
        name: name.trim(),
        description: desc.trim(),
        institution: user.institution,
        department: user.department,
        category: 'UG',
        createdBy: user.email,
        admins: [user.email],
        members: [user.email],
        isPublic: true,
      });
      setName(''); setDesc('');
      onCreated(group);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create group.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, { zIndex: 50 }]}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: colors.cardElevated ?? colors.card, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Create New Group</Text>

          <Text style={[styles.label, { color: colors.textMuted }]}>Group Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. CS Final Year 2026"
            placeholderTextColor={colors.textSubtle}
            style={[styles.textInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
          <TextInput
            value={desc}
            onChangeText={setDesc}
            placeholder="What is this group about?"
            placeholderTextColor={colors.textSubtle}
            multiline
            style={[styles.textArea, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
          />

          <Pressable
            style={[styles.uploadBtn, { backgroundColor: colors.accent }, saving && { opacity: 0.65 }]}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="people" size={18} color="#fff" /><Text style={styles.uploadBtnText}>Create Group</Text></>}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, colors }: { icon: string; title: string; colors: any }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={14} color={colors.textSubtle} />
      <Text style={[styles.sectionTitle, { color: colors.textSubtle }]}>{title}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function UploadScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileInfo, setFileInfo] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Visibility
  const [isPublic, setIsPublic] = useState(true);
  const [visibilityScope, setVisibilityScope] = useState<VisibilityScope>('department');
  // When scope=group, selectedGroup doubles as the private group target

  const headerEntrance = useEntrance(0, 18);
  const formEntrance = useEntrance(80, 16);
  const uploadBtnPress = usePressAnim(0.95);
  const uploadBtnPop = useIconPop(200);
  const shareBtnPress = usePressAnim(0.93);
  const filePickerPress = usePressAnim(0.97);
  const uploadPulse = usePulse(1, 1.03, 700);

  const fileBounce = useRef(new Animated.Value(1)).current;
  const statusPop = useRef(new Animated.Value(0)).current;

  function bounceFile() {
    Animated.sequence([
      Animated.spring(fileBounce, { toValue: 1.06, friction: 4, useNativeDriver: true }),
      Animated.spring(fileBounce, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }

  function popStatus() {
    statusPop.setValue(0);
    Animated.spring(statusPop, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }

  function resetForm() {
    setFileInfo(null);
    setTitle('');
    setDescription('');
    setSelectedGroup(null);
    setIsPublic(true);
    setVisibilityScope('department');
    setStatus('');
    setDownloadUrl('');
    statusPop.setValue(0);
  }

  const loadGroups = useCallback(() => {
    if (!user) return;
    fetchPublicGroups(user.institution, user.department)
      .then(setGroups)
      .catch(() => {});
  }, [user]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: allowedFileTypes, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > 250 * 1024 * 1024) {
      Alert.alert('File too large', 'File exceeds the 250 MB limit.');
      return;
    }
    setFileInfo(asset);
    if (!title) setTitle(asset.name.replace(/\.[^/.]+$/, ''));
    setStatus('');
    setDownloadUrl('');
    bounceFile();
  };

  const uploadFile = async () => {
    if (!user) { Alert.alert('Not signed in'); return; }
    if (!fileInfo?.uri) { Alert.alert('No file', 'Please choose a file first.'); return; }
    if (!title.trim()) { Alert.alert('Title required', 'Please enter a title.'); return; }
    if (!isPublic && visibilityScope === 'group' && !selectedGroup) {
      Alert.alert('Group required', 'Please select a group for private group visibility.');
      return;
    }

    const institution = user.institution || 'unknown';
    const department = user.department || 'unknown';
    const year = user.year || 'unknown';

    try {
      setUploading(true);
      setStatus('Preparing…');

      const base64 = await FileSystem.readAsStringAsync(fileInfo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const filePath = `${institution}/${department}/${year}/${Date.now()}-${fileInfo.name}`;

      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, bytes.buffer, { contentType: fileInfo.mimeType || 'application/octet-stream' });
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      const link = urlData.publicUrl;

      const fileType = fileInfo.mimeType?.includes('pdf') ? 'pdf'
        : fileInfo.mimeType?.includes('image') ? 'image'
        : fileInfo.mimeType?.includes('presentation') ? 'presentation'
        : fileInfo.mimeType?.includes('sheet') || fileInfo.mimeType?.includes('excel') || fileInfo.mimeType?.includes('csv') ? 'spreadsheet'
        : 'document';

      // Group to link for chat notification (always, when a group is chosen)
      const notifyGroup = selectedGroup;

      // For private+group scope, group_id scopes visibility to that group
      const visibilityGroup = (!isPublic && visibilityScope === 'group') ? selectedGroup : null;

      const insertData: Record<string, unknown> = {
        title: title.trim() || fileInfo.name,
        description,
        category: 'resource',
        file_type: fileType,
        uploaded_by: user.email,
        department,
        year,
        institution,
        share_link: link,
      };

      if (visibilityGroup) {
        insertData.group_id = visibilityGroup.id;
        insertData.group_name = visibilityGroup.name;
      } else if (notifyGroup && isPublic) {
        insertData.group_id = notifyGroup.id;
        insertData.group_name = notifyGroup.name;
      }

      const { error: dbError } = await supabase.from('materials').insert(insertData);
      if (dbError) throw dbError;

      // Post the file as a message in the group chat so it appears inline
      if (notifyGroup) {
        const displayName = user.studentName || user.email.split('@')[0];
        try {
          await sendGroupMessage(
            notifyGroup.id,
            title.trim() || fileInfo.name,
            user.email,
            displayName,
            { url: link, name: fileInfo.name, fileType },
          );
        } catch {
          // non-blocking — upload already succeeded
        }
      }

      setStatus('Upload complete!');
      setDownloadUrl(link);
      popStatus();

      setTimeout(resetForm, 2200);
    } catch (err: any) {
      setStatus(err.message || 'Upload failed.');
      popStatus();
    } finally {
      setUploading(false);
    }
  };

  const shareLink = async () => {
    if (!downloadUrl) return;
    await Share.share({ message: getShareMessage(downloadUrl) });
  };

  const effectiveGroup = (!isPublic && visibilityScope === 'group') ? selectedGroup : (isPublic ? selectedGroup : null);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View style={[styles.pageHeader, headerEntrance.style]}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Upload</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Share resources with your campus</Text>
        </Animated.View>

        <Animated.View style={formEntrance.style}>
          {/* ── File Section ── */}
          <SectionHeader icon="document-outline" title="File" colors={colors} />
          <Animated.View style={{ transform: [{ scale: Animated.multiply(filePickerPress.scale, fileBounce) }] }}>
            <Pressable
              style={[styles.filePicker, { backgroundColor: colors.card, borderColor: fileInfo ? colors.green : colors.border }]}
              onPress={pickDocument}
              onPressIn={filePickerPress.onPressIn}
              onPressOut={filePickerPress.onPressOut}
              disabled={uploading}
            >
              <View style={[styles.fileIconBox, { backgroundColor: fileInfo ? `${colors.green}18` : colors.accentBg }]}>
                <Ionicons
                  name={fileInfo ? 'document-attach' : 'attach-outline'}
                  size={22}
                  color={fileInfo ? colors.green : colors.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.filePickerText, { color: fileInfo ? colors.text : colors.textSubtle }]} numberOfLines={1}>
                  {fileInfo ? fileInfo.name : 'Tap to choose a file'}
                </Text>
                <Text style={[{ fontSize: 11, color: colors.textSubtle, marginTop: 2 }]}>
                  {fileInfo ? `${((fileInfo.size ?? 0) / 1024).toFixed(1)} KB` : 'PDF, DOC, PPT, XLS, CSV, PNG, JPEG · Max 250 MB'}
                </Text>
              </View>
              {fileInfo
                ? <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                : <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
              }
            </Pressable>
          </Animated.View>

          {/* ── Details Section ── */}
          <SectionHeader icon="create-outline" title="Details" colors={colors} />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={colors.textSubtle}
            style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Description (optional)"
            placeholderTextColor={colors.textSubtle}
            style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          />

          {/* ── Visibility Section ── */}
          <SectionHeader icon="eye-outline" title="Visibility" colors={colors} />
          <View style={[styles.visToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable
              style={[styles.visBtn, isPublic && { backgroundColor: colors.accent }]}
              onPress={() => setIsPublic(true)}
            >
              <Ionicons name="globe-outline" size={15} color={isPublic ? '#fff' : colors.textMuted} />
              <Text style={[styles.visBtnText, { color: isPublic ? '#fff' : colors.textMuted }]}>Public</Text>
            </Pressable>
            <Pressable
              style={[styles.visBtn, !isPublic && { backgroundColor: colors.red }]}
              onPress={() => setIsPublic(false)}
            >
              <Ionicons name="lock-closed-outline" size={15} color={!isPublic ? '#fff' : colors.textMuted} />
              <Text style={[styles.visBtnText, { color: !isPublic ? '#fff' : colors.textMuted }]}>Private</Text>
            </Pressable>
          </View>

          {isPublic ? (
            <View style={[styles.visNote, { backgroundColor: colors.accentBg, borderColor: `${colors.accent}25` }]}>
              <Ionicons name="information-circle-outline" size={13} color={colors.accent} />
              <Text style={[styles.visNoteText, { color: colors.accent }]}>
                Visible to everyone in your department
              </Text>
            </View>
          ) : (
            <View style={[styles.privateBox, { backgroundColor: `${colors.red}08`, borderColor: `${colors.red}20` }]}>
              <ScopeDropdown selected={visibilityScope} onSelect={setVisibilityScope} colors={colors} />
              {visibilityScope === 'group' && (
                <GroupDropdown
                  groups={groups}
                  selected={selectedGroup}
                  onSelect={setSelectedGroup}
                  onOpenCreate={() => setShowCreate(true)}
                  colors={colors}
                />
              )}
            </View>
          )}

          {/* ── Group Section (public notification / private group link) ── */}
          {(isPublic || visibilityScope !== 'group') && (
            <>
              <SectionHeader icon="people-outline" title="Group Notification" colors={colors} />
              <GroupDropdown
                groups={groups}
                selected={isPublic ? selectedGroup : null}
                onSelect={isPublic ? setSelectedGroup : () => {}}
                onOpenCreate={() => setShowCreate(true)}
                colors={colors}
              />
            </>
          )}

          {/* Group chat note */}
          {effectiveGroup && (
            <View style={[styles.groupNote, { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}25` }]}>
              <Ionicons name="chatbubbles-outline" size={13} color={colors.accent} />
              <Text style={[styles.groupNoteText, { color: colors.accent }]}>
                File will be posted in <Text style={{ fontWeight: '800' }}>{effectiveGroup.name}</Text> group chat
              </Text>
            </View>
          )}

          {/* ── Upload Button ── */}
          <Animated.View style={{ transform: [{ scale: Animated.multiply(uploadBtnPress.scale, uploading ? uploadPulse : uploadBtnPop) }], marginTop: 22 }}>
            <Pressable
              style={[styles.uploadBtn, { backgroundColor: colors.accent }, uploading && styles.disabled]}
              onPress={uploadFile}
              onPressIn={uploadBtnPress.onPressIn}
              onPressOut={uploadBtnPress.onPressOut}
              disabled={uploading}
            >
              <Ionicons name={uploading ? 'cloud-upload' : 'cloud-upload-outline'} size={19} color="#ffffff" />
              <Text style={styles.uploadBtnText}>{uploading ? 'Uploading…' : 'Upload Document'}</Text>
            </Pressable>
          </Animated.View>

          {/* Status */}
          {!!status && (
            <Animated.View style={[
              styles.statusRow,
              {
                backgroundColor: status.includes('complete') ? colors.greenBg : colors.card,
                borderColor: colors.border,
                transform: [{ scale: statusPop }],
                opacity: statusPop,
              },
            ]}>
              <Ionicons
                name={status.includes('complete') ? 'checkmark-circle' : status === 'Preparing…' ? 'hourglass-outline' : 'close-circle'}
                size={15}
                color={status.includes('complete') ? colors.green : status === 'Preparing…' ? colors.amber : colors.red}
              />
              <Text style={[styles.statusText, { color: status.includes('complete') ? colors.green : colors.textMuted }]}>
                {status}
              </Text>
              {status.includes('complete') && effectiveGroup && (
                <Text style={[styles.statusSub, { color: colors.accent }]}>
                  · Shared in {effectiveGroup.name}
                </Text>
              )}
            </Animated.View>
          )}

          {/* Share button */}
          {!!downloadUrl && (
            <Animated.View style={{ transform: [{ scale: shareBtnPress.scale }] }}>
              <Pressable
                style={[styles.shareBtn, { borderColor: colors.accent, backgroundColor: colors.accentBg }]}
                onPress={shareLink}
                onPressIn={shareBtnPress.onPressIn}
                onPressOut={shareBtnPress.onPressOut}
              >
                <Ionicons name="share-social-outline" size={17} color={colors.accent} />
                <Text style={[styles.shareText, { color: colors.accent }]}>Share upload link</Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Create group bottom sheet */}
      <CreateGroupSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(g) => {
          setGroups(prev => [g, ...prev]);
          setSelectedGroup(g);
          loadGroups();
        }}
        user={user}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 48, paddingHorizontal: 20 },
  pageHeader: { marginBottom: 22 },
  pageTitle: { fontSize: 26, fontWeight: '800' },
  pageSubtitle: { fontSize: 13, marginTop: 3 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 6 },
  sectionTitle: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.9 },

  filePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 14, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 18,
  },
  fileIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filePickerText: { fontSize: 14, fontWeight: '600' },

  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 },
  textInput: { borderRadius: 13, padding: 13, fontSize: 14, borderWidth: 1, marginBottom: 14 },
  textArea: { borderRadius: 13, padding: 13, minHeight: 80, fontSize: 14, lineHeight: 21, textAlignVertical: 'top', borderWidth: 1, marginBottom: 18 },

  // Visibility toggle
  visToggle: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  visBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  visBtnText: { fontSize: 14, fontWeight: '700' },
  visNote: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 18 },
  visNoteText: { fontSize: 12, flex: 1 },
  privateBox: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 4 },

  // Dropdown
  dropdown: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 13, padding: 13, borderWidth: 1,
  },
  dropdownList: {
    borderRadius: 13, borderWidth: 1, marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  dropdownItemNew: {},

  groupNote: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 4, marginTop: 4 },
  groupNoteText: { fontSize: 12, flex: 1, lineHeight: 17 },

  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15, borderRadius: 13, marginBottom: 14 },
  uploadBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.7 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 11, padding: 12, marginBottom: 12, borderWidth: 1, flexWrap: 'wrap' },
  statusText: { fontSize: 13 },
  statusSub: { fontSize: 12, fontWeight: '600' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  shareText: { fontWeight: '700', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
});
