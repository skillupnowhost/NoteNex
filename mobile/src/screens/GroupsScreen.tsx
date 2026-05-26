import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, FlatList, Modal, Pressable,
  ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { Group, createGroup, fetchUserGroups, inviteMemberToGroup, deleteGroup } from '../lib/queries';
import { useEntrance, useIconPop, usePressAnim, usePulse } from '../lib/animations';

// ─── Create Group Modal ───────────────────────────────────────────────────────

function CreateGroupModal({
  visible, onClose, onCreated, user, colors,
}: { visible: boolean; onClose: () => void; onCreated: () => void; user: any; colors: any }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<'UG' | 'PG' | 'Other'>('UG');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const sheetAnim = useRef(new Animated.Value(340)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(sheetAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetAnim, { toValue: 340, duration: 200, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('Required', 'Please enter a group name.'); return; }
    try {
      setSaving(true);
      await createGroup({
        name: name.trim(), description: desc.trim(),
        institution: user.institution, department: user.department,
        category, createdBy: user.email,
        admins: [user.email], members: [user.email], isPublic,
      });
      setName(''); setDesc('');
      onCreated(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create group.');
    } finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: colors.cardElevated, transform: [{ translateY: sheetAnim }] }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Create Group</Text>

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Group Name *</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. CS Final Year 2026" placeholderTextColor={colors.textSubtle} style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]} />

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Description</Text>
          <TextInput value={desc} onChangeText={setDesc} placeholder="What is this group about?" placeholderTextColor={colors.textSubtle} multiline numberOfLines={3} style={[styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]} />

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Category</Text>
          <View style={styles.categoryRow}>
            {(['UG', 'PG', 'Other'] as const).map(c => (
              <Pressable key={c} style={[styles.catBtn, { borderColor: colors.border }, category === c && { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={() => setCategory(c)}>
                <Text style={[styles.catText, { color: category === c ? '#fff' : colors.textMuted }]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 2 }]}>Public Group</Text>
              <Text style={[styles.switchDesc, { color: colors.textSubtle }]}>Anyone in your dept can see it</Text>
            </View>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: colors.accent, false: colors.border }} />
          </View>

          <Pressable style={[styles.createBtn, { backgroundColor: colors.accent }, saving && { opacity: 0.65 }]} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createBtnText}>Create Group</Text>}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({
  visible, group, onClose, colors,
}: { visible: boolean; group: Group | null; onClose: () => void; colors: any }) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const sheetAnim = useRef(new Animated.Value(300)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(sheetAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  async function handleInvite() {
    if (!email.trim() || !group) return;
    try {
      setSaving(true);
      await inviteMemberToGroup(group.id, email.trim().toLowerCase());
      Alert.alert('Invited!', `${email} has been added to ${group.name}.`);
      setEmail(''); onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not invite member.');
    } finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: colors.cardElevated, transform: [{ translateY: sheetAnim }] }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Invite Member</Text>
          {group && <Text style={[styles.inviteGroup, { color: colors.textMuted }]}>to {group.name}</Text>}

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Member Email *</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="colleague@campus.edu" placeholderTextColor={colors.textSubtle} keyboardType="email-address" autoCapitalize="none" style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]} />

          <Pressable style={[styles.createBtn, { backgroundColor: colors.accent }, saving && { opacity: 0.65 }]} onPress={handleInvite} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="person-add-outline" size={17} color="#fff" /><Text style={styles.createBtnText}>Send Invite</Text></>}
          </Pressable>
          <Text style={[styles.inviteNote, { color: colors.textSubtle }]}>They will see this group when they sign in with that email.</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  UG: '#3b82f6', PG: '#8b5cf6', Other: '#f59e0b',
};

function GroupCard({
  group, isAdmin, onInvite, onDelete, delay,
}: { group: Group; isAdmin: boolean; onInvite: (g: Group) => void; onDelete: (g: Group) => void; delay: number }) {
  const { colors } = useTheme();
  const entrance = useEntrance(delay, 18);
  const press = usePressAnim(0.97);
  const invitePress = usePressAnim(0.92);
  const deletePress = usePressAnim(0.88);
  const color = CATEGORY_COLOR[group.category] ?? colors.accent;

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, entrance.style]}>
      <Pressable
        style={{ flexDirection: 'row', flex: 1, overflow: 'hidden' }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
      >
        <Animated.View style={[{ flexDirection: 'row', flex: 1 }, { transform: [{ scale: press.scale }] }]}>
          <View style={[styles.cardAccent, { backgroundColor: color }]} />
          <View style={styles.cardBody}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
                <Text style={[styles.cardDept, { color: colors.textMuted }]}>{group.department}</Text>
              </View>
              <View style={[styles.catPill, { backgroundColor: `${color}20`, borderColor: color }]}>
                <Text style={[styles.catPillText, { color }]}>{group.category}</Text>
              </View>
            </View>

            {!!group.description && (
              <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={2}>{group.description}</Text>
            )}

            <View style={styles.cardFooter}>
              <View style={styles.memberInfo}>
                <Ionicons name="people-outline" size={13} color={colors.textSubtle} />
                <Text style={[styles.memberCount, { color: colors.textSubtle }]}>
                  {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                </Text>
                {group.isPublic && (
                  <View style={[styles.publicBadge, { backgroundColor: colors.greenBg }]}>
                    <Text style={[styles.publicText, { color: colors.green }]}>Public</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.accentBg }]}
                  onPress={() => onInvite(group)}
                  onPressIn={invitePress.onPressIn}
                  onPressOut={invitePress.onPressOut}
                >
                  <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, { transform: [{ scale: invitePress.scale }] }]}>
                    <Ionicons name="person-add-outline" size={14} color={colors.accent} />
                    <Text style={[styles.actionText, { color: colors.accent }]}>Invite</Text>
                  </Animated.View>
                </Pressable>
                {isAdmin && (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: `${colors.red}14` }]}
                    onPress={() => onDelete(group)}
                    onPressIn={deletePress.onPressIn}
                    onPressOut={deletePress.onPressOut}
                  >
                    <Animated.View style={{ transform: [{ scale: deletePress.scale }] }}>
                      <Ionicons name="trash-outline" size={14} color={colors.red} />
                    </Animated.View>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GroupsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [search, setSearch] = useState('');

  const headerEntrance = useEntrance(0, 16);
  const searchEntrance = useEntrance(80, 12);
  const statsEntrance = useEntrance(140, 14);
  const fabPulse = usePulse(1, 1.05, 1100);
  const fabPop = useIconPop(100);
  const fabPress = usePressAnim(0.9);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchUserGroups(user.email, user.institution);
      setGroups(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load groups.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  function handleRefresh() { setRefreshing(true); loadGroups(); }
  function handleInvite(g: Group) { setSelectedGroup(g); setInviteModal(true); }
  function handleDelete(g: Group) {
    Alert.alert('Delete Group', `Delete "${g.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteGroup(g.id); loadGroups(); } catch (e: any) { Alert.alert('Error', e.message); } } },
    ]);
  }

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.department.toLowerCase().includes(search.toLowerCase()),
  );

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <Animated.View style={[styles.topRow, headerEntrance.style]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Groups</Text>
          <Text style={[styles.pageSub, { color: colors.textMuted }]}>{user.department} · {user.institution.toUpperCase()}</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: Animated.multiply(fabPress.scale, fabPop) }] }}>
          <Pressable
            style={[styles.fab, { backgroundColor: colors.accent }]}
            onPress={() => setCreateModal(true)}
            onPressIn={fabPress.onPressIn}
            onPressOut={fabPress.onPressOut}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.fabText}>New</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>

      {/* Search */}
      <Animated.View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }, searchEntrance.style]}>
        <Ionicons name="search-outline" size={16} color={colors.textSubtle} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search groups…"
          placeholderTextColor={colors.textSubtle}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textSubtle} />
          </Pressable>
        )}
      </Animated.View>

      {/* Stats row */}
      <Animated.View style={[styles.statsRow, statsEntrance.style]}>
        {[
          { label: 'Groups', value: groups.length, color: colors.accent },
          { label: 'Members', value: groups.reduce((s, g) => s + g.members.length, 0), color: colors.green },
          { label: 'As Admin', value: groups.filter(g => g.admins.includes(user.email)).length, color: colors.purple },
        ].map((s, i) => (
          <StatBox key={s.label} label={s.label} value={s.value} color={s.color} delay={i * 60} />
        ))}
      </Animated.View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.accent} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={g => g.id}
          contentContainerStyle={styles.list}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState search={search} onCreatePress={() => setCreateModal(true)} colors={colors} />
          }
          renderItem={({ item, index }) => (
            <GroupCard group={item} isAdmin={item.admins.includes(user.email)} onInvite={handleInvite} onDelete={handleDelete} delay={index * 55} />
          )}
        />
      )}

      <CreateGroupModal visible={createModal} onClose={() => setCreateModal(false)} onCreated={loadGroups} user={user} colors={colors} />
      <InviteModal visible={inviteModal} group={selectedGroup} onClose={() => setInviteModal(false)} colors={colors} />
    </View>
  );
}

function StatBox({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  const { colors } = useTheme();
  const press = usePressAnim(0.93);
  const iconScale = useIconPop(delay + 80);
  return (
    <Pressable style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: Animated.multiply(press.scale, iconScale) }] }}>
        <Text style={[styles.statVal, { color }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textSubtle }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function EmptyState({ search, onCreatePress, colors }: { search: string; onCreatePress: () => void; colors: any }) {
  const entrance = useEntrance(0, 30);
  const iconPop = useIconPop(120);
  const press = usePressAnim(0.93);
  return (
    <Animated.View style={[styles.emptyWrap, entrance.style]}>
      <Animated.View style={{ transform: [{ scale: iconPop }] }}>
        <Ionicons name="people-outline" size={52} color={colors.textSubtle} />
      </Animated.View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No groups yet</Text>
      <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
        {search ? 'No groups match your search.' : 'Create your first group and invite teammates.'}
      </Text>
      {!search && (
        <Pressable style={[styles.emptyBtn, { backgroundColor: colors.accent }]} onPress={onCreatePress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
          <Animated.Text style={[styles.emptyBtnText, { transform: [{ scale: press.scale }] }]}>Create Group</Animated.Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  pageTitle: { fontSize: 26, fontWeight: '800' },
  pageSub: { fontSize: 12, marginTop: 2 },
  fab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, marginHorizontal: 20, marginBottom: 14, padding: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 14 },
  statBox: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardDept: { fontSize: 12, marginTop: 2 },
  catPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  catPillText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  memberCount: { fontSize: 12 },
  publicBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  publicText: { fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionText: { fontSize: 12, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 18 },
  inviteGroup: { fontSize: 13, marginTop: -14, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 },
  textInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, marginBottom: 16 },
  textArea: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, marginBottom: 16, minHeight: 80, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  catBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  catText: { fontWeight: '700', fontSize: 13 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  switchDesc: { fontSize: 11 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginBottom: 8 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  inviteNote: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
