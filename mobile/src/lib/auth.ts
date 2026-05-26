import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getInstitutionFromEmail } from './supabase';
import { CampusUser, UserRole } from '../types';

const USER_STORAGE_KEY = 'notenex_user';

export class EmailConfirmationRequiredError extends Error {
  constructor() {
    super('Account created! Please check your email and tap the confirmation link, then sign in.');
    this.name = 'EmailConfirmationRequiredError';
  }
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('email rate'))
    return 'Too many sign-up attempts. Please wait a few minutes and try again.';
  if (m.includes('already registered') || m.includes('already exists') || m.includes('user already'))
    return 'An account with this email already exists. Please sign in instead.';
  if (m.includes('not authorized') || m.includes('not allowed') || m.includes('email address is not authorized'))
    return 'This email domain is not allowed. Please use your campus email address.';
  if (m.includes('invalid email') || m.includes('email address is invalid') || m.includes('unable to validate email'))
    return 'Please enter a valid email address (e.g. yourname@college.edu).';
  if (m.includes('invalid login credentials') || m.includes('invalid credentials') || m.includes('email not confirmed'))
    return 'Incorrect email or password. Please try again.';
  if (m.includes('password') && (m.includes('least') || m.includes('short') || m.includes('weak')))
    return 'Password must be at least 6 characters.';
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch'))
    return 'Network error. Please check your internet connection and try again.';
  return message;
}

function securityToRole(level: string): UserRole {
  const l = level.toLowerCase();
  if (l.includes('hod'))       return 'hod';
  if (l.includes('principal')) return 'principal';
  if (l.includes('admin'))     return 'admin';
  if (l.includes('faculty') || l.includes('lecturer') || l.includes('professor')) return 'professor';
  return 'student';
}

function buildUserPayload(
  uid: string, email: string, department: string, year: string, securityLevel = 'Student',
  studentName = '', collegeName = '', boardOrUniversity = '', studentId = '',
): CampusUser {
  const institution = getInstitutionFromEmail(email);
  return {
    uid, email, studentName,
    institution: institution.slug,
    institutionName: institution.name,
    collegeName, boardOrUniversity, studentId,
    department, year,
    role: securityToRole(securityLevel),
    securityLevel,
  };
}

export async function loginWithEmail(
  email: string, password: string, department: string, year: string,
): Promise<CampusUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendlyAuthError(error.message));
  const uid = data.user.id;

  // Fetch existing profile to preserve securityLevel, role and new fields
  const { data: profile } = await supabase
    .from('profiles')
    .select('security_level, student_name, college_name, board_or_university, student_id')
    .eq('id', uid)
    .single();

  const securityLevel = profile?.security_level ?? 'Student';
  const studentName = profile?.student_name ?? '';
  const collegeName = profile?.college_name ?? '';
  const boardOrUniversity = profile?.board_or_university ?? '';
  const studentId = profile?.student_id ?? '';
  const payload = buildUserPayload(uid, data.user.email ?? email, department, year, securityLevel, studentName, collegeName, boardOrUniversity, studentId);

  // Update profile with latest department/year
  await supabase.from('profiles').upsert({
    id: uid,
    email: payload.email,
    institution: payload.institution,
    institution_name: payload.institutionName,
    student_name: studentName,
    college_name: collegeName,
    board_or_university: boardOrUniversity,
    student_id: studentId,
    department,
    year,
    role: payload.role,
    security_level: securityLevel,
  });

  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export async function registerWithEmail(
  email: string, password: string, department: string, year: string, securityLevel = 'Student',
  studentName = '', collegeName = '', boardOrUniversity = '', studentId = '',
): Promise<CampusUser> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { department, year, securityLevel } },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
  if (!data.user) throw new Error('Registration failed. Please try again.');

  // No session means Supabase requires email confirmation before login
  if (!data.session) {
    throw new EmailConfirmationRequiredError();
  }

  const uid = data.user.id;
  const payload = buildUserPayload(uid, data.user.email ?? email, department, year, securityLevel, studentName, collegeName, boardOrUniversity, studentId);

  await supabase.from('profiles').insert({
    id: uid,
    email: payload.email,
    institution: payload.institution,
    institution_name: payload.institutionName,
    student_name: studentName,
    college_name: collegeName,
    board_or_university: boardOrUniversity,
    student_id: studentId,
    department,
    year,
    role: payload.role,
    security_level: securityLevel,
  });

  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  await AsyncStorage.removeItem(USER_STORAGE_KEY);
}

export async function getSavedUser(): Promise<CampusUser | null> {
  // Wrap getSession with a timeout so a slow/offline network doesn't hang the app indefinitely
  const sessionResult = await Promise.race([
    supabase.auth.getSession(),
    new Promise<{ data: { session: null } }>(resolve =>
      setTimeout(() => resolve({ data: { session: null } }), 8000),
    ),
  ]);
  const { data: { session } } = sessionResult;
  if (!session) {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
  const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CampusUser;
  } catch {
    return null;
  }
}

export async function updateUserPhoto(uid: string, photoURL: string | null): Promise<void> {
  await supabase.from('profiles').update({ photo_url: photoURL }).eq('id', uid);

  const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return;
  try {
    const user = JSON.parse(raw) as CampusUser;
    if (user.uid !== uid) return;
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...user, photoURL: photoURL ?? undefined }));
  } catch {
    // ignore parse errors
  }
}
