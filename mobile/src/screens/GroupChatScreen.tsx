import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, FlatList, KeyboardAvoidingView,
  Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import {
  fetchGroupMessages, fetchMaterialsByGroup, inviteMemberToGroup, sendGroupMessage,
  Group,
} from '../lib/queries';
import { supabase } from '../lib/supabase';
import { GroupMessage, MaterialItem } from '../types';
import { useEntrance, usePressAnim } from '../lib/animations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
  return (name || '?').slice(0, 2).toUpperCase();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const FILE_ICON: Record<string, { icon: string; color: string }> = {
  pdf:          { icon: 'document-text',  color: '#dc2626' },
  document:     { icon: 'document',       color: '#2563eb' },
  presentation: { icon: 'easel',          color: '#d97706' },
  spreadsheet:  { icon: 'grid',           color: '#16a34a' },
  image:        { icon: 'image',          color: '#0891b2' },
};

type Tab = 'chat' | 'media' | 'files' | 'members';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'chat',    icon: 'chatbubbles-outline', label: 'Chat' },
  { key: 'media',   icon: 'images-outline',      label: 'Media' },
  { key: 'files',   icon: 'document-outline',    label: 'Files' },
  { key: 'members', icon: 'people-outline',      label: 'Members' },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size, accent }: { name: string; size: number; accent: string }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${accent}22`, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '800', color: accent }}>{getInitials(name)}</Text>
    </View>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe, colors }: { msg: GroupMessage; isMe: boolean; colors: any }) {
  const entrance = useEntrance(0, 10);
  return (
    <Animated.View style={[styles.msgRow, isMe && styles.msgRowMe, entrance.style]}>
      {!isMe && (
        <View style={styles.avatarWrap}>
          <Avatar name={msg.senderName || msg.senderEmail} size={30} accent={colors.accent} />
        </View>
      )}
      <View style={[styles.bubble, isMe ? [styles.bubbleMe, { backgroundColor: colors.accent }] : [styles.bubbleThem, { backgroundColor: colors.card, borderColor: colors.border }]]}>
        {!isMe && (
          <Text style={[styles.senderName, { color: colors.accent }]} numberOfLines={1}>
            {msg.senderName || msg.senderEmail.split('@')[0]}
          </Text>
        )}
        {msg.type === 'file' && msg.fileUrl ? (
          <Pressable onPress={() => Linking.openURL(msg.fileUrl!)}>
            <View style={[styles.fileMsgCard, { backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : `${colors.accent}12`, borderColor: isMe ? 'rgba(255,255,255,0.25)' : `${colors.accent}30` }]}>
              <Ionicons name="document-attach" size={20} color={isMe ? '#fff' : colors.accent} />
              <Text style={[styles.fileMsgName, { color: isMe ? '#fff' : colors.text }]} numberOfLines={2}>
                {msg.fileName || msg.text}
              </Text>
              <Ionicons name="open-outline" size={14} color={isMe ? 'rgba(255,255,255,0.7)' : colors.accent} />
            </View>
          </Pressable>
        ) : (
          <Text style={[styles.bubbleText, { color: isMe ? '#fff' : colors.text }]}>{msg.text}</Text>
        )}
        <Text style={[styles.bubbleTime, { color: isMe ? 'rgba(255,255,255,0.65)' : colors.textSubtle }]}>
          {formatTime(msg.createdAt)}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Date Separator ───────────────────────────────────────────────────────────

function DateSep({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={styles.dateSepRow}>
      <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.dateSepText, { color: colors.textSubtle, backgroundColor: colors.bg }]}>{label}</Text>
      <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({ group, user, colors }: { group: Group; user: any; colors: any }) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const displayName = user?.studentName || user?.email?.split('@')[0] || 'User';

  const load = useCallback(async () => {
    try {
      const data = await fetchGroupMessages(group.id);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [group.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`grp_msg_${group.id}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'group_messages' },
        (payload: any) => {
          if (payload.new?.group_id !== group.id) return;
          const row = payload.new;
          const newMsg: GroupMessage = {
            id: row.id, groupId: row.group_id, text: row.text ?? '',
            senderEmail: row.sender_email, senderName: row.sender_name,
            type: row.type ?? 'text', fileUrl: row.file_url, fileName: row.file_name,
            createdAt: row.created_at,
          };
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [newMsg, ...prev];
          });
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn('GroupChat realtime error:', err);
      });
    return () => { supabase.removeChannel(channel); };
  }, [group.id]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    setText('');
    setSending(true);
    try {
      await sendGroupMessage(group.id, trimmed, user.email, displayName);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not send message.');
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  // Build renderable items: insert date separators
  const items: (GroupMessage | { _separator: string })[] = [];
  let lastDate = '';
  for (const msg of [...messages].reverse()) {
    const d = formatDate(msg.createdAt);
    if (d !== lastDate) {
      items.push({ _separator: d });
      lastDate = d;
    }
    items.push(msg);
  }
  const renderItems = [...items].reverse();

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={renderItems}
        keyExtractor={(item, i) => ('_separator' in item ? `sep-${item._separator}-${i}` : item.id)}
        inverted
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubbles-outline" size={44} color={colors.textSubtle} />
            <Text style={[styles.emptyChatText, { color: colors.textMuted }]}>No messages yet. Say hello!</Text>
          </View>
        }
        renderItem={({ item }) => {
          if ('_separator' in item) return <DateSep label={item._separator} colors={colors} />;
          return <MessageBubble msg={item} isMe={item.senderEmail === user?.email} colors={colors} />;
        }}
      />
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={colors.textSubtle}
          style={[styles.msgInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.accent : colors.border }]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={17} color="#fff" />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Media Tab ────────────────────────────────────────────────────────────────

function MediaTab({ group, colors }: { group: Group; colors: any }) {
  const [images, setImages] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterialsByGroup(group.id)
      .then(data => setImages(data.filter(m => m.fileType === 'image')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [group.id]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;
  if (!images.length) {
    return (
      <View style={styles.emptyTab}>
        <Ionicons name="images-outline" size={46} color={colors.textSubtle} />
        <Text style={[styles.emptyTabText, { color: colors.textMuted }]}>No media shared yet</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.mediaGrid} showsVerticalScrollIndicator={false}>
      {images.map(img => (
        <Pressable
          key={img.id}
          style={[styles.mediaTile, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => img.shareLink && Linking.openURL(img.shareLink)}
        >
          <Ionicons name="image-outline" size={32} color="#0891b2" />
          <Text style={[styles.mediaTileText, { color: colors.textMuted }]} numberOfLines={2}>{img.title}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Files Tab ────────────────────────────────────────────────────────────────

function FilesTab({ group, colors }: { group: Group; colors: any }) {
  const [files, setFiles] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterialsByGroup(group.id)
      .then(data => setFiles(data.filter(m => m.fileType !== 'image')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [group.id]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;
  if (!files.length) {
    return (
      <View style={styles.emptyTab}>
        <Ionicons name="document-outline" size={46} color={colors.textSubtle} />
        <Text style={[styles.emptyTabText, { color: colors.textMuted }]}>No files shared yet</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.fileList} showsVerticalScrollIndicator={false}>
      {files.map(f => {
        const cfg = FILE_ICON[f.fileType] ?? FILE_ICON.document;
        return (
          <Pressable
            key={f.id}
            style={[styles.fileRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => f.shareLink && Linking.openURL(f.shareLink)}
          >
            <View style={[styles.fileIconWrap, { backgroundColor: `${cfg.color}15` }]}>
              <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{f.title}</Text>
              <Text style={[styles.fileMeta, { color: colors.textSubtle }]}>
                {f.uploadedBy} · {new Date(f.uploadedAt).toLocaleDateString()}
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.accent} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({ group, user, colors, onInvited }: { group: Group; user: any; colors: any; onInvited: () => void }) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const isAdmin = group.admins.includes(user?.email ?? '');

  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    if (!group.isPublic && user?.department) {
      // Advisory check — actual enforcement relies on email domain convention
    }
    setSaving(true);
    try {
      await inviteMemberToGroup(group.id, trimmed);
      Alert.alert('Invited!', `${trimmed} has been added to this group.`);
      setEmail('');
      onInvited();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not invite member.');
    } finally {
      setSaving(false);
    }
  };

  const handleShareLink = async () => {
    const deptNote = !group.isPublic
      ? `\nNote: This group is restricted to ${group.department} students.`
      : '';
    await Share.share({
      message: `Join "${group.name}" on NoteNex!${deptNote}\n\nGroup code: NNGRP-${group.id.slice(0, 8).toUpperCase()}`,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.membersList} showsVerticalScrollIndicator={false}>
      {/* Invite section */}
      {isAdmin && (
        <View style={[styles.inviteSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.inviteSectionTitle, { color: colors.text }]}>Invite Member</Text>
          {!group.isPublic && (
            <View style={[styles.deptNote, { backgroundColor: `${colors.amber}15` }]}>
              <Ionicons name="shield-outline" size={13} color={colors.amber} />
              <Text style={[styles.deptNoteText, { color: colors.amber }]}>
                Private group · {group.department} students only
              </Text>
            </View>
          )}
          <View style={styles.inviteRow}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="student@campus.edu"
              placeholderTextColor={colors.textSubtle}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.inviteInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
            />
            <Pressable
              style={[styles.inviteBtn, { backgroundColor: colors.accent }, saving && { opacity: 0.6 }]}
              onPress={handleInvite}
              disabled={saving || !email.trim()}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="person-add-outline" size={17} color="#fff" />}
            </Pressable>
          </View>
          <Pressable
            style={[styles.shareLinkBtn, { borderColor: colors.accent, backgroundColor: colors.accentBg }]}
            onPress={handleShareLink}
          >
            <Ionicons name="share-social-outline" size={15} color={colors.accent} />
            <Text style={[styles.shareLinkText, { color: colors.accent }]}>Share Invite Link</Text>
          </Pressable>
        </View>
      )}

      {/* Members list */}
      <Text style={[styles.memberCount, { color: colors.textSubtle }]}>
        {group.members.length} member{group.members.length !== 1 ? 's' : ''}
      </Text>
      {group.members.map((email) => {
        const isAdm = group.admins.includes(email);
        const isCreator = group.createdBy === email;
        const initials = (email || '??').slice(0, 2).toUpperCase();
        return (
          <View key={email} style={[styles.memberRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.memberAvatar, { backgroundColor: `${colors.accent}20` }]}>
              <Text style={[styles.memberInitials, { color: colors.accent }]}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberEmail, { color: colors.text }]} numberOfLines={1}>{email}</Text>
              {(isAdm || isCreator) && (
                <Text style={[styles.memberRole, { color: colors.accent }]}>
                  {isCreator ? 'Creator' : 'Admin'}
                </Text>
              )}
            </View>
            {isAdm && <Ionicons name="shield-checkmark" size={14} color={colors.accent} />}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  UG: '#3b82f6', PG: '#8b5cf6', Other: '#f59e0b',
};

export default function GroupChatScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [group, setGroup] = useState<Group>(route.params?.group);
  const tabIndicator = useRef(new Animated.Value(0)).current;

  const accentColor = CATEGORY_COLOR[group?.category] ?? colors.accent;

  useEffect(() => {
    const idx = TABS.findIndex(t => t.key === activeTab);
    Animated.spring(tabIndicator, { toValue: idx, friction: 7, useNativeDriver: false }).start();
  }, [activeTab]);

  if (!group || !user) return null;

  const tabWidth = 100 / TABS.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Custom header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top + 6 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
        </Pressable>
        <View style={[styles.groupAvatarHeader, { backgroundColor: `${accentColor}20` }]}>
          <Text style={[styles.groupAvatarText, { color: accentColor }]}>{getInitials(group.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
          <Text style={[styles.groupMeta, { color: colors.textSubtle }]}>
            {group.members.length} member{group.members.length !== 1 ? 's' : ''} · {group.isPublic ? 'Public' : 'Private'} · {group.department}
          </Text>
        </View>
        <Pressable
          style={[styles.headerAction, { backgroundColor: `${accentColor}15` }]}
          onPress={() => setActiveTab('members')}
        >
          <Ionicons name="people-outline" size={18} color={accentColor} />
        </Pressable>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS.map((tab, idx) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={isActive ? accentColor : colors.textSubtle}
              />
              <Text style={[styles.tabLabel, { color: isActive ? accentColor : colors.textSubtle }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              backgroundColor: accentColor,
              width: `${tabWidth}%` as any,
              left: tabIndicator.interpolate({
                inputRange: TABS.map((_, i) => i),
                outputRange: TABS.map((_, i) => `${i * tabWidth}%`),
              }),
            },
          ]}
        />
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'chat'    && <ChatTab    group={group} user={user} colors={colors} />}
        {activeTab === 'media'   && <MediaTab   group={group} colors={colors} />}
        {activeTab === 'files'   && <FilesTab   group={group} colors={colors} />}
        {activeTab === 'members' && <MembersTab group={group} user={user} colors={colors} onInvited={() => setGroup(g => ({ ...g }))} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  groupAvatarHeader: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  groupAvatarText: { fontSize: 14, fontWeight: '800' },
  groupName: { fontSize: 15, fontWeight: '700' },
  groupMeta: { fontSize: 11, marginTop: 1 },
  headerAction: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Tabs
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, position: 'relative' },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 },
  tabLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  tabIndicator: { position: 'absolute', bottom: 0, height: 2, borderRadius: 1 },

  // Chat
  chatList: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, flexDirection: 'column' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  avatarWrap: { marginBottom: 4 },
  bubble: { maxWidth: '78%', borderRadius: 18, padding: 10, gap: 2, borderWidth: 1 },
  bubbleMe: { borderRadius: 18, borderBottomRightRadius: 4, borderWidth: 0 },
  bubbleThem: { borderRadius: 18, borderBottomLeftRadius: 4 },
  senderName: { fontSize: 11, fontWeight: '800', marginBottom: 2 },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  bubbleTime: { fontSize: 10, alignSelf: 'flex-end', marginTop: 2 },
  fileMsgCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 8, marginVertical: 2 },
  fileMsgName: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 17 },
  dateSepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 10 },
  dateLine: { flex: 1, height: 1 },
  dateSepText: { fontSize: 11, fontWeight: '600', paddingHorizontal: 6 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  emptyChatText: { fontSize: 14 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1 },
  msgInput: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100, borderWidth: 1 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },

  // Media
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  mediaTile: { width: '30%', aspectRatio: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  mediaTileText: { fontSize: 10, textAlign: 'center', paddingHorizontal: 4 },

  // Files
  fileList: { padding: 14, gap: 8 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12, borderWidth: 1 },
  fileIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 14, fontWeight: '600' },
  fileMeta: { fontSize: 11, marginTop: 2 },

  // Members
  membersList: { padding: 14, gap: 10 },
  inviteSection: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10, marginBottom: 4 },
  inviteSectionTitle: { fontSize: 14, fontWeight: '700' },
  deptNote: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, padding: 8 },
  deptNoteText: { fontSize: 12, fontWeight: '600', flex: 1 },
  inviteRow: { flexDirection: 'row', gap: 8 },
  inviteInput: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  inviteBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  shareLinkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, borderWidth: 1, paddingVertical: 10 },
  shareLinkText: { fontSize: 13, fontWeight: '700' },
  memberCount: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, borderWidth: 1 },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  memberInitials: { fontSize: 13, fontWeight: '800' },
  memberEmail: { fontSize: 13, fontWeight: '600' },
  memberRole: { fontSize: 11, fontWeight: '700', marginTop: 1 },

  // Empty states
  emptyTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTabText: { fontSize: 14 },
});
