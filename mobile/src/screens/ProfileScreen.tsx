import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useEntrance, useIconPop, usePressAnim } from '../lib/animations';

// ─── Animated Row ─────────────────────────────────────────────────────────────

function Row({
  icon, label, value, onPress, danger, toggle, toggleValue, delay,
}: {
  icon: string; label: string; value?: string;
  onPress?: () => void; danger?: boolean;
  toggle?: boolean; toggleValue?: boolean; delay: number;
}) {
  const { colors } = useTheme();
  const entrance = useEntrance(delay, 12);
  const press = usePressAnim(0.97);
  const iconPop = useIconPop(delay + 60);

  return (
    <Animated.View style={[{ borderBottomWidth: 1, borderBottomColor: colors.border }, entrance.style]}>
      <Pressable
        style={styles.row}
        onPress={onPress}
        onPressIn={onPress ? press.onPressIn : undefined}
        onPressOut={onPress ? press.onPressOut : undefined}
        disabled={!onPress && !toggle}
      >
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }, { transform: [{ scale: press.scale }] }]}>
          <Animated.View style={[styles.rowIcon, { backgroundColor: danger ? `${colors.red}15` : colors.inputBg, transform: [{ scale: iconPop }] }]}>
            <Ionicons name={icon as any} size={18} color={danger ? colors.red : colors.accent} />
          </Animated.View>
          <Text style={[styles.rowLabel, { color: danger ? colors.red : colors.text }]}>{label}</Text>
          {toggle !== undefined ? (
            <Switch value={toggleValue} onValueChange={onPress as any} trackColor={{ true: colors.accent, false: colors.border }} />
          ) : value ? (
            <Text style={[styles.rowValue, { color: colors.textMuted }]}>{value}</Text>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getDisplayName(email: string) {
  return email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function copyToAppDir(uri: string): Promise<string> {
  const dest = `${FileSystem.documentDirectory}profile_photo.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, signOut, updatePhotoURL } = useAuth();
  const insets = useSafeAreaInsets();

  const avatarScale = useRef(new Animated.Value(0.65)).current;
  const avatarEntrance = useEntrance(0, 22);
  const infoEntrance = useEntrance(200, 16);
  const footerEntrance = useEntrance(700, 14);
  const editBtnPop = useIconPop(300);
  const editBtnPress = usePressAnim(0.93);
  const avatarPress = usePressAnim(0.94);

  useEffect(() => {
    Animated.spring(avatarScale, { toValue: 1, friction: 4, tension: 65, useNativeDriver: true }).start();
  }, []);

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as const,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const persistent = await copyToAppDir(result.assets[0].uri);
      await updatePhotoURL(persistent);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow camera access to take a profile photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const persistent = await copyToAppDir(result.assets[0].uri);
      await updatePhotoURL(persistent);
    }
  }

  function handlePhotoPress() {
    const hasPhoto = !!user?.photoURL;
    const options: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> = [
      { text: 'Choose from Gallery', onPress: pickFromGallery },
      { text: 'Take Photo', onPress: takePhoto },
    ];
    if (hasPhoto) {
      options.push({ text: 'Remove Photo', style: 'destructive', onPress: async () => { await updatePhotoURL(null); } });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile Photo', 'Choose an option', options);
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { try { await signOut(); } catch (err: any) { Alert.alert('Error', err.message); } },
      },
    ]);
  }

  if (!user) return null;

  const initials = user.email.slice(0, 2).toUpperCase();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar section */}
      <Animated.View style={[styles.avatarSection, avatarEntrance.style]}>
        <Pressable onPress={handlePhotoPress} style={styles.avatarTouchable} onPressIn={avatarPress.onPressIn} onPressOut={avatarPress.onPressOut}>
          <Animated.View style={[styles.avatarOuter, { borderColor: colors.accent, transform: [{ scale: Animated.multiply(avatarScale, avatarPress.scale) }] }]}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatarPhoto} />
              ) : (
                <Text style={styles.initials}>{initials}</Text>
              )}
            </View>
          </Animated.View>
          <View style={[styles.editBadge, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
            <Ionicons name="camera" size={13} color="#ffffff" />
          </View>
        </Pressable>

        <Text style={[styles.userName, { color: colors.text }]}>{user.studentName || getDisplayName(user.email)}</Text>
        <Text style={[styles.userInstitution, { color: colors.accent }]}>{user.collegeName || user.institutionName}</Text>
        <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user.email}</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <BadgePop label={user.role.toUpperCase()} bgColor={colors.accentBg} borderColor={colors.accent} textColor={colors.accent} delay={260} />
          {user.securityLevel && user.securityLevel.toLowerCase() !== user.role.toLowerCase() && (
            <BadgePop label={user.securityLevel} bgColor={colors.greenBg} borderColor={colors.green} textColor={colors.green} delay={320} />
          )}
        </View>

        <Pressable
          onPress={handlePhotoPress}
          onPressIn={editBtnPress.onPressIn}
          onPressOut={editBtnPress.onPressOut}
          style={[styles.editPhotoBtn, { borderColor: colors.accent }]}
        >
          <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, { transform: [{ scale: Animated.multiply(editBtnPress.scale, editBtnPop) }] }]}>
            <Ionicons name="image-outline" size={14} color={colors.accent} />
            <Text style={[styles.editPhotoText, { color: colors.accent }]}>
              {user.photoURL ? 'Edit Photo' : 'Add Photo'}
            </Text>
          </Animated.View>
        </Pressable>
      </Animated.View>

      {/* Info card */}
      <Animated.View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }, infoEntrance.style]}>
        {!!user.studentName && (
          <>
            <InfoRow icon="person-outline" label="Name" value={user.studentName} colors={colors} delay={200} />
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
          </>
        )}
        <InfoRow icon="school-outline" label="Department" value={user.department} colors={colors} delay={220} />
        <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
        <InfoRow icon="calendar-outline" label="Year" value={user.year} colors={colors} delay={270} />
        {!!user.boardOrUniversity && (
          <>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <InfoRow icon="ribbon-outline" label="Board / University" value={user.boardOrUniversity} colors={colors} delay={310} />
          </>
        )}
        {!!user.studentId && (
          <>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <InfoRow icon="id-card-outline" label="Student ID" value={user.studentId} colors={colors} delay={340} />
          </>
        )}
      </Animated.View>

      {/* Sections */}
      <SectionLabel title="Appearance" delay={330} />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row icon={isDark ? 'moon' : 'sunny'} label="Dark Mode" toggle toggleValue={isDark} onPress={toggleTheme} delay={350} />
      </View>

      <SectionLabel title="Account" delay={400} />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row icon="mail-outline" label="Email" value={user.email} delay={420} />
        <Row icon="finger-print-outline" label="Institution ID" value={user.institution} delay={470} />
      </View>

      <SectionLabel title="System" delay={520} />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row icon="information-circle-outline" label="Version" value="1.0.0" delay={540} />
      </View>

      <SectionLabel title="Session" delay={580} />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row icon="log-out-outline" label="Sign Out" onPress={handleSignOut} danger delay={600} />
      </View>

      {/* Footer */}
      <Animated.View style={[styles.footerWrap, footerEntrance.style]}>
        <Image
            source={isDark ? require('../../assets/icon-dark.png') : require('../../assets/icon-light.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        <Text style={[styles.footerText, { color: colors.textSubtle }]}>NoteNex 2026 · SkillUpNow</Text>
      </Animated.View>
    </ScrollView>
  );
}

function BadgePop({ label, bgColor, borderColor, textColor, delay }: { label: string; bgColor: string; borderColor: string; textColor: string; delay: number }) {
  const pop = useIconPop(delay);
  return (
    <Animated.View style={[styles.roleBadge, { backgroundColor: bgColor, borderColor, transform: [{ scale: pop }] }]}>
      <Text style={[styles.roleText, { color: textColor }]}>{label}</Text>
    </Animated.View>
  );
}

function InfoRow({ icon, label, value, colors, delay }: { icon: string; label: string; value: string; colors: any; delay: number }) {
  const iconPop = useIconPop(delay);
  return (
    <View style={styles.infoRow}>
      <Animated.View style={{ transform: [{ scale: iconPop }] }}>
        <Ionicons name={icon as any} size={14} color={colors.textSubtle} />
      </Animated.View>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function SectionLabel({ title, delay }: { title: string; delay: number }) {
  const { colors } = useTheme();
  const entrance = useEntrance(delay, 8);
  return (
    <Animated.Text style={[styles.sectionTitle, { color: colors.textSubtle }, entrance.style]}>{title}</Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 24, paddingHorizontal: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarTouchable: { marginBottom: 12 },
  avatarOuter: { width: 90, height: 90, borderRadius: 45, borderWidth: 2.5, padding: 3 },
  avatar: { flex: 1, borderRadius: 42, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarPhoto: { width: '100%', height: '100%', borderRadius: 42 },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  initials: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  userName: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  userInstitution: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  userEmail: { fontSize: 13, marginBottom: 10 },
  roleBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  editPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  editPhotoText: { fontSize: 13, fontWeight: '600' },
  infoCard: { borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  infoLabel: { fontSize: 13, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600' },
  infoDivider: { height: 1, marginVertical: 8 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8, marginLeft: 4,
  },
  section: { borderRadius: 16, borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  rowValue: { fontSize: 13 },
  footerWrap: { alignItems: 'center', marginTop: 8, gap: 6 },
  footerLogo: { width: 36, height: 36, opacity: 0.5 },
  footerText: { fontSize: 12 },
});
