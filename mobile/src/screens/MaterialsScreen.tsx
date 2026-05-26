import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { deleteMaterial, fetchMaterials } from '../lib/queries';
import { MaterialItem } from '../types';
import { useEntrance, useIconPop, usePressAnim, useShimmer, useSpin } from '../lib/animations';

const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  pdf:          { icon: 'document-text',  color: '#dc2626' },
  document:     { icon: 'document',       color: '#2563eb' },
  presentation: { icon: 'easel',          color: '#d97706' },
  spreadsheet:  { icon: 'grid',           color: '#16a34a' },
  image:        { icon: 'image',          color: '#0891b2' },
};

// ─── Material Card ────────────────────────────────────────────────────────────

function MaterialCard({
  item, delay, canDelete, onDelete,
}: {
  item: MaterialItem;
  delay: number;
  canDelete: boolean;
  onDelete: (item: MaterialItem) => void;
}) {
  const { colors } = useTheme();
  const entrance = useEntrance(delay, 20);
  const press = usePressAnim(0.96);
  const cfg = FILE_ICONS[item.fileType] ?? FILE_ICONS.document;
  const iconPop = useIconPop(delay + 80);
  const deletePress = usePressAnim(0.88);
  const [opening, setOpening] = useState(false);

  const openFile = async () => {
    if (!item.shareLink) return;
    const extMap: Record<string, string> = {
      pdf: '.pdf', document: '.docx', presentation: '.pptx',
      spreadsheet: '.xlsx', image: '.jpg',
    };
    const ext = extMap[item.fileType] ?? '.bin';
    const safeName = item.title.replace(/[^a-zA-Z0-9\-_]/g, '_') + ext;
    const localUri = `${FileSystem.cacheDirectory ?? ''}${safeName}`;
    try {
      setOpening(true);
      const info = await FileSystem.getInfoAsync(localUri);
      if (!info.exists) {
        await FileSystem.downloadAsync(item.shareLink, localUri);
      }
      let openUri = localUri;
      if (Platform.OS === 'android') {
        openUri = await (FileSystem as any).getContentUriAsync(localUri);
      }
      const supported = await Linking.canOpenURL(openUri);
      if (supported) {
        await Linking.openURL(openUri);
      } else {
        Alert.alert('No app found', 'No app is installed to open this file type. Try installing a PDF viewer.');
      }
    } catch {
      Alert.alert('Cannot open', 'Could not open this file on your device.');
    } finally {
      setOpening(false);
    }
  };

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, entrance.style]}>
      <Pressable
        style={styles.cardMain}
        onPress={openFile}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
      >
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1, transform: [{ scale: press.scale }] }}>
          <Animated.View style={[styles.fileIcon, { backgroundColor: `${cfg.color}14`, transform: [{ scale: iconPop }] }]}>
            <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
          </Animated.View>
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.cardMeta, { color: colors.accent }]}>
              {item.category}  ·  {item.fileType.toUpperCase()}
            </Text>
            <Text style={[styles.cardCaption, { color: colors.textSubtle }]} numberOfLines={1}>
              {item.uploadedBy}
            </Text>
            {item.groupName ? (
              <View style={styles.groupTag}>
                <Ionicons name="people-outline" size={11} color={colors.accent} />
                <Text style={[styles.groupTagText, { color: colors.accent }]}>{item.groupName}</Text>
              </View>
            ) : null}
          </View>
          {opening
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Ionicons name="apps-outline" size={16} color={colors.textSubtle} />
          }
        </Animated.View>
      </Pressable>

      {canDelete && (
        <Pressable
          style={[styles.deleteBtn, { backgroundColor: `${colors.red}12` }]}
          onPress={() => onDelete(item)}
          onPressIn={deletePress.onPressIn}
          onPressOut={deletePress.onPressOut}
        >
          <Animated.View style={{ transform: [{ scale: deletePress.scale }] }}>
            <Ionicons name="trash-outline" size={16} color={colors.red} />
          </Animated.View>
        </Pressable>
      )}
    </Animated.View>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function SkeletonCard({ delay }: { delay: number }) {
  const { colors } = useTheme();
  const shimmer = useShimmer();
  const entrance = useEntrance(delay, 16);
  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, entrance.style]}>
      <Animated.View style={[styles.fileIcon, { backgroundColor: colors.border, opacity: shimmer }]} />
      <View style={styles.cardBody}>
        <Animated.View style={[styles.skeletonLine, { width: '70%', backgroundColor: colors.border, opacity: shimmer }]} />
        <Animated.View style={[styles.skeletonLine, { width: '45%', backgroundColor: colors.border, opacity: shimmer, marginTop: 6 }]} />
        <Animated.View style={[styles.skeletonLine, { width: '55%', backgroundColor: colors.border, opacity: shimmer, marginTop: 5 }]} />
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MaterialsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);

  const headerEntrance = useEntrance(0, 16);
  const countPop = useIconPop(180);
  const spinRotate = useSpin(800);

  const isPrivileged = user?.role !== 'student';

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    fetchMaterials(user.institution, user.department, user.year)
      .then(r => { setItems(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (item: MaterialItem) => {
    Alert.alert(
      'Delete Material',
      `Delete "${item.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMaterial(item.id);
              setItems(prev => prev.filter(m => m.id !== item.id));
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not delete material.');
            }
          },
        },
      ],
    );
  };

  if (!user) return null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.pageHeader, headerEntrance.style]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Materials</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Notes, lectures, and resources</Text>
        </View>
        <Animated.View style={[styles.countBadge, { backgroundColor: colors.accentBg, borderColor: colors.accent, transform: [{ scale: countPop }] }]}>
          <Text style={[styles.countText, { color: colors.accent }]}>{items.length}</Text>
        </Animated.View>
      </Animated.View>

      {loading ? (
        <>
          <View style={styles.loadingRow}>
            <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
              <Ionicons name="refresh-outline" size={22} color={colors.accent} />
            </Animated.View>
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading materials…</Text>
          </View>
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} delay={i * 60} />)}
        </>
      ) : items.length ? (
        items.map((item, i) => (
          <MaterialCard
            key={item.id}
            item={item}
            delay={i * 65}
            canDelete={isPrivileged || item.uploadedBy === user.email}
            onDelete={handleDelete}
          />
        ))
      ) : (
        <EmptyMaterials colors={colors} />
      )}
    </ScrollView>
  );
}

function EmptyMaterials({ colors }: { colors: any }) {
  const entrance = useEntrance(0, 30);
  const iconPop = useIconPop(120);
  return (
    <Animated.View style={[styles.empty, entrance.style]}>
      <Animated.View style={{ transform: [{ scale: iconPop }] }}>
        <Ionicons name="book-outline" size={52} color={colors.border} />
      </Animated.View>
      <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No materials yet</Text>
      <Text style={[styles.emptyText, { color: colors.textSubtle }]}>Your department has no uploads yet.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 32, paddingHorizontal: 20 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  pageTitle: { fontSize: 26, fontWeight: '800' },
  pageSubtitle: { fontSize: 13, marginTop: 3 },
  countBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  countText: { fontWeight: '800', fontSize: 14 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  loadingText: { fontSize: 13 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 9,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', flex: 1, padding: 13, gap: 11 },
  fileIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  cardMeta: { fontSize: 11, fontWeight: '600', marginBottom: 3 },
  cardCaption: { fontSize: 12 },
  groupTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  groupTagText: { fontSize: 11, fontWeight: '600' },
  deleteBtn: { padding: 14, justifyContent: 'center', alignItems: 'center', minWidth: 46 },
  skeletonLine: { height: 11, borderRadius: 6 },
  empty: { alignItems: 'center', paddingTop: 56, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
