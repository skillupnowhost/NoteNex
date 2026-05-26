import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Configuration ────────────────────────────────────────────────────────────
// Set these in your .env.local file:
//   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Storage ──────────────────────────────────────────────────────────────────

export const STORAGE_BUCKET = 'materials';

// ─── Institution mapping ──────────────────────────────────────────────────────

export const institutionMap: Record<string, { slug: string; name: string }> = {
  'mcet.in':    { slug: 'mcet',   name: 'MCET Institute' },
  'sctc.edu':   { slug: 'sctc',   name: 'SCTC College' },
  'college.edu':{ slug: 'global', name: 'Global Academy' },
};

export function getInstitutionFromEmail(email: string) {
  const domain = email.split('@')[1] ?? '';
  return institutionMap[domain] ?? { slug: domain.replace(/\W+/g, '-').toLowerCase(), name: 'Partner Institution' };
}

// ─── Shared constants ─────────────────────────────────────────────────────────

export const allowedFileTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
];

export function getShareMessage(link: string) {
  return `Access your campus materials on NoteNex: ${link}`;
}
