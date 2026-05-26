import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, FlatList, Keyboard, KeyboardAvoidingView,
  Modal, Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/AuthContext';
import { EmailConfirmationRequiredError } from '../lib/auth';
import { useTheme } from '../lib/ThemeContext';
import PageFooter from '../components/PageFooter';
import { useEntrance, usePressAnim, useIconPop } from '../lib/animations';

// ─── Department data ──────────────────────────────────────────────────────────

const DEPT_GROUPS: { label: string; items: string[] }[] = [
  {
    label: 'UG Programs',
    items: ['BCA', 'BSc IT', 'BSc CS', 'BSc Math', 'BBA', 'BCom',
      'BE CSE', 'BE IT', 'BE ECE', 'BE EEE', 'BE Mechanical', 'BE Civil'],
  },
  {
    label: 'PG Programs',
    items: ['MCA', 'MBA', 'MTech CSE', 'MTech ECE', 'MTech IT',
      'MSc IT', 'MSc CS', 'MSc Math', 'MA', 'MCom'],
  },
  {
    label: 'Research & Other',
    items: ['PhD', 'Diploma', 'Certificate Course', 'General / Other'],
  },
];

const ALL_DEPTS = DEPT_GROUPS.flatMap(g => g.items);
const SECURITY_LEVELS = ['Student', 'Faculty / Lecturer', 'HOD', 'Dean', 'Principal', 'Admin'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG Year 1', 'PG Year 2'];

// ─── Picker Modal ─────────────────────────────────────────────────────────────

function PickerModal({
  visible, title, items, groups, selected, onSelect, onClose, colors,
}: {
  visible: boolean; title: string; items?: string[];
  groups?: { label: string; items: string[] }[];
  selected: string; onSelect: (v: string) => void; onClose: () => void; colors: any;
}) {
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

  const flatData: ({ type: 'header'; label: string } | { type: 'item'; value: string })[] = [];
  if (groups) {
    groups.forEach(g => {
      flatData.push({ type: 'header', label: g.label });
      g.items.forEach(i => flatData.push({ type: 'item', value: i }));
    });
  } else if (items) {
    items.forEach(i => flatData.push({ type: 'item', value: i }));
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: colors.cardElevated, transform: [{ translateY: sheetAnim }] }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
          <FlatList
            data={flatData}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return <Text style={[styles.groupLabel, { color: colors.accent }]}>{item.label}</Text>;
              }
              const isSelected = item.value === selected;
              return (
                <TouchableOpacity
                  style={[styles.option, isSelected && { backgroundColor: colors.accentBg }]}
                  onPress={() => { onSelect(item.value); onClose(); }}
                >
                  <Text style={[styles.optionText, { color: isSelected ? colors.accent : colors.text }]}>{item.value}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
                </TouchableOpacity>
              );
            }}
            style={{ maxHeight: 400 }}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Animated Input Field ─────────────────────────────────────────────────────

function AnimatedInput({ delay, children }: { delay: number; children: React.ReactNode }) {
  const entrance = useEntrance(delay, 14);
  return <Animated.View style={entrance.style}>{children}</Animated.View>;
}

function DropdownField({
  label, value, icon, onPress, colors, delay,
}: { label: string; value: string; icon: string; onPress: () => void; colors: any; delay: number }) {
  const press = usePressAnim(0.97);
  const iconPop = useIconPop(delay + 80);
  return (
    <AnimatedInput delay={delay}>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
        <Pressable
          style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          onPress={onPress}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
        >
          <Animated.View style={{ transform: [{ scale: iconPop }] }}>
            <Ionicons name={icon as any} size={16} color={colors.textSubtle} style={styles.inputIcon} />
          </Animated.View>
          <Text style={[styles.dropdownText, { color: value ? colors.text : colors.textSubtle }]} numberOfLines={1}>
            {value || 'Select…'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSubtle} style={{ paddingHorizontal: 12 }} />
        </Pressable>
      </View>
    </AnimatedInput>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('BSc IT');
  const [year, setYear] = useState(YEARS[0]);
  const [securityLevel, setSecurityLevel] = useState('Student');
  const [studentName, setStudentName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [boardOrUniversity, setBoardOrUniversity] = useState('');
  const [studentId, setStudentId] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deptModal, setDeptModal] = useState(false);
  const [yearModal, setYearModal] = useState(false);
  const [secModal, setSecModal] = useState(false);

  const brandEntrance = useEntrance(0, 30);
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const formEntrance = useEntrance(220, 20);
  const submitPress = usePressAnim(0.96);
  const switchPress = usePressAnim(0.96);

  // Logo spring-pop on mount
  useEffect(() => {
    Animated.spring(logoScale, { toValue: 1, friction: 4, tension: 70, useNativeDriver: true }).start();
  }, []);

  // Slide form when mode changes
  const modeSlide = useRef(new Animated.Value(0)).current;
  const modeOpacity = useRef(new Animated.Value(1)).current;
  function switchMode(next: 'signin' | 'signup') {
    Animated.parallel([
      Animated.timing(modeOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(modeSlide, { toValue: 10, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setMode(next);
      modeSlide.setValue(-10);
      Animated.parallel([
        Animated.timing(modeOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(modeSlide, { toValue: 0, friction: 7, useNativeDriver: true }),
      ]).start();
    });
  }

  async function handleSubmit() {
    Keyboard.dismiss();
    if (!email.trim() || !password) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }
    if (!email.trim().includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      if (mode === 'signin') {
        await signIn(email.trim().toLowerCase(), password, department, year);
      } else {
        await signUp(email.trim().toLowerCase(), password, department, year, securityLevel, studentName.trim(), collegeName.trim(), boardOrUniversity.trim(), studentId.trim());
      }
    } catch (err: any) {
      if (err instanceof EmailConfirmationRequiredError) {
        Alert.alert(
          'Confirm Your Email',
          err.message,
          [{ text: 'OK', onPress: () => switchMode('signin') }],
        );
      } else {
        Alert.alert(
          mode === 'signin' ? 'Login Failed' : 'Sign Up Failed',
          err.message || 'Unable to continue. Please check your connection and try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Brand */}
        <Animated.View style={[styles.brand, brandEntrance.style]}>
          <Animated.Image
            source={require('../../assets/notenex-logo.png')}
            style={[styles.logoImg, { transform: [{ scale: logoScale }] }]}
            resizeMode="contain"
          />
          <Animated.View style={{ opacity: modeOpacity, transform: [{ translateY: modeSlide }] }}>
            <Text style={[styles.welcome, { color: colors.text }]}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={[styles.welcomeSub, { color: colors.textMuted }]}>
              {mode === 'signin' ? 'Sign in to your campus account' : 'Join NoteNex campus workspace'}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Form */}
        <Animated.View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }, formEntrance.style]}>
          {/* Email */}
          <AnimatedInput delay={260}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Campus Email</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Ionicons name="mail-outline" size={16} color={colors.textSubtle} style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@campus.edu"
                  placeholderTextColor={colors.textSubtle}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.text }]}
                />
              </View>
            </View>
          </AnimatedInput>

          {/* Password */}
          <AnimatedInput delay={320}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Password</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textSubtle} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSubtle}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.text }]}
                />
                <Pressable onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.textSubtle} />
                </Pressable>
              </View>
            </View>
          </AnimatedInput>

          {/* Sign-up only fields */}
          {mode === 'signup' && (
            <>
              <AnimatedInput delay={380}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Full Name</Text>
                  <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Ionicons name="person-outline" size={16} color={colors.textSubtle} style={styles.inputIcon} />
                    <TextInput
                      value={studentName}
                      onChangeText={setStudentName}
                      placeholder="Your full name"
                      placeholderTextColor={colors.textSubtle}
                      autoCapitalize="words"
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                </View>
              </AnimatedInput>

              <DropdownField label="Department" value={department} icon="school-outline" onPress={() => setDeptModal(true)} colors={colors} delay={440} />
              <DropdownField label="Academic Year" value={year} icon="calendar-outline" onPress={() => setYearModal(true)} colors={colors} delay={500} />
              <DropdownField label="Security Level / Role" value={securityLevel} icon="shield-outline" onPress={() => setSecModal(true)} colors={colors} delay={560} />

              <AnimatedInput delay={610}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Institution / College / School Name</Text>
                  <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Ionicons name="business-outline" size={16} color={colors.textSubtle} style={styles.inputIcon} />
                    <TextInput
                      value={collegeName}
                      onChangeText={setCollegeName}
                      placeholder="e.g. St. Xavier's College"
                      placeholderTextColor={colors.textSubtle}
                      autoCapitalize="words"
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                </View>
              </AnimatedInput>

              <AnimatedInput delay={660}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Board / University</Text>
                  <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Ionicons name="ribbon-outline" size={16} color={colors.textSubtle} style={styles.inputIcon} />
                    <TextInput
                      value={boardOrUniversity}
                      onChangeText={setBoardOrUniversity}
                      placeholder="e.g. Anna University, CBSE"
                      placeholderTextColor={colors.textSubtle}
                      autoCapitalize="words"
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                </View>
              </AnimatedInput>

              <AnimatedInput delay={710}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Student ID</Text>
                  <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Ionicons name="id-card-outline" size={16} color={colors.textSubtle} style={styles.inputIcon} />
                    <TextInput
                      value={studentId}
                      onChangeText={setStudentId}
                      placeholder="Your institution student ID"
                      placeholderTextColor={colors.textSubtle}
                      autoCapitalize="characters"
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                </View>
              </AnimatedInput>
            </>
          )}

          {/* Submit */}
          <Animated.View style={{ transform: [{ scale: submitPress.scale }], marginTop: 20 }}>
            <Pressable
              style={[styles.submitBtn, { backgroundColor: colors.accent }, loading && styles.disabled]}
              onPress={handleSubmit}
              onPressIn={submitPress.onPressIn}
              onPressOut={submitPress.onPressOut}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading
                  ? mode === 'signin' ? 'Signing in…' : 'Creating account…'
                  : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
              {!loading && <Ionicons name="arrow-forward" size={17} color="#ffffff" />}
            </Pressable>
          </Animated.View>

          {mode === 'signup' && (
            <Text style={[styles.termsText, { color: colors.textSubtle }]}>
              By signing up you agree to our Terms of Service and Privacy Policy.
            </Text>
          )}
        </Animated.View>

        {/* Mode switch */}
        <Animated.View style={{ transform: [{ scale: switchPress.scale }] }}>
          <Pressable
            style={styles.switchRow}
            onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            onPressIn={switchPress.onPressIn}
            onPressOut={switchPress.onPressOut}
          >
            <Text style={[styles.switchText, { color: colors.textMuted }]}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={[styles.switchLink, { color: colors.accent }]}>
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </Text>
            </Text>
          </Pressable>
        </Animated.View>

        <View style={{ height: 16 }} />
      </ScrollView>

      <PageFooter />

      <PickerModal visible={deptModal} title="Select Department" groups={DEPT_GROUPS} selected={department} onSelect={setDepartment} onClose={() => setDeptModal(false)} colors={colors} />
      <PickerModal visible={yearModal} title="Select Academic Year" items={YEARS} selected={year} onSelect={setYear} onClose={() => setYearModal(false)} colors={colors} />
      <PickerModal visible={secModal} title="Select Security Level" items={SECURITY_LEVELS} selected={securityLevel} onSelect={setSecurityLevel} onClose={() => setSecModal(false)} colors={colors} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  brand: { alignItems: 'center', marginBottom: 24 },
  logoImg: { width: 200, height: 100, marginBottom: 4 },
  welcome: { fontSize: 22, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  welcomeSub: { fontSize: 13, marginTop: 2, marginBottom: 8, textAlign: 'center' },
  form: { borderRadius: 20, padding: 18, borderWidth: 1 },
  switchRow: { alignItems: 'center', marginTop: 18, marginBottom: 4 },
  switchText: { fontSize: 14 },
  switchLink: { fontWeight: '700' },
  inputGroup: { marginBottom: 2 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 12, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  inputIcon: { paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 13, paddingRight: 12, fontSize: 14 },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 13 },
  dropdownText: { flex: 1, paddingVertical: 13, fontSize: 14 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  submitText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.65 },
  termsText: { fontSize: 11, textAlign: 'center', marginTop: 12, lineHeight: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 32, paddingHorizontal: 16 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12, paddingHorizontal: 4 },
  groupLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 4, paddingVertical: 8, marginTop: 4 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2 },
  optionText: { fontSize: 15, fontWeight: '500' },
});
