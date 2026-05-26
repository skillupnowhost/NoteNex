// Supabase migration shim — re-exports from supabase.ts for backward compatibility
export {
  supabase,
  STORAGE_BUCKET,
  allowedFileTypes,
  institutionMap,
  getInstitutionFromEmail,
  getShareMessage,
} from './supabase';
